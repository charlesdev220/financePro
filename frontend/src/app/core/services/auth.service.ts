import { Injectable, inject, Injector } from '@angular/core';
import { HttpBackend, HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SheetsApiService } from './sheets-api.service';
import { CryptoService } from './crypto.service';
import { KJUR } from 'jsrsasign';

export interface GoogleUser {
  sub: string;
  email: string;
  name: string;
}

/**
 * AuthService — Autenticación híbrida: Service Account (acceso a Sheets) + login propio.
 *
 * Flujo de Service Account:
 *   La app genera un JWT firmado con la clave RSA de la SA y obtiene un access_token
 *   de Google OAuth2. Ese token se añade a cada request de SheetsApiService.
 *
 * Flujo de usuario:
 *   1. register(): cifra email+nombre con AES-GCM, hashea password (SHA-256), escribe en USERS.
 *   2. login(): lee USERS, valida hash, descifra nombre, establece sesión.
 *   3. La sesión se persiste en localStorage (solo datos no sensibles: sub, email en claro, name).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly httpBackend = inject(HttpBackend);
  private readonly bareHttp = new HttpClient(this.httpBackend);
  private readonly injector = inject(Injector);
  private readonly cryptoService = inject(CryptoService);

  private accessToken: string | null = null;
  private currentUser: GoogleUser | null = null;
  private tokenExpiry = 0;
  private isSigningIn = false;
  private signInPromise: Promise<string | null> | null = null;

  constructor() {
    const savedUser = localStorage.getItem('myfinance_user');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      this.cryptoService
        .deriveKey(this.currentUser!.sub)
        .catch(err => console.error('[AuthService] Key derivation failed on restore:', err));
    }
    this.signIn().catch(err => console.error('[AuthService] Auto service-account login failed:', err));
  }

  // ---------------------------------------------------------------------------
  // User auth
  // ---------------------------------------------------------------------------

  /**
   * Registra un nuevo usuario en la hoja USERS.
   * - user_id: UUID v4 generado en browser (nunca el email).
   * - email y display_name se cifran con AES-GCM (clave derivada del UUID).
   * - email_hash: SHA-256(email) en claro — solo para lookup en login.
   * - password_hash: SHA-256(email:password) — nunca en claro.
   *
   * Schema USERS (A:H):
   *   user_id | email_hash | email_enc | display_name_enc | password_hash | currency | period_start | created_at
   */
  async register(data: { email: string; password: string; name: string }): Promise<boolean> {
    try {
      await this.signIn();

      // 1. Generar UUID como user_id real (FK de todas las tablas)
      const userId = crypto.randomUUID();

      // 2. Derivar clave del usuario a partir del UUID
      await this.cryptoService.deriveKey(userId);

      // 3. Preparar todos los valores en paralelo
      const [emailHash, encEmail, encName, passwordHash] = await Promise.all([
        this.cryptoService.hashEmail(data.email),
        this.cryptoService.encrypt(data.email),
        this.cryptoService.encrypt(data.name),
        this.cryptoService.hashPassword(data.email, data.password),
      ]);

      const newUserRow = [
        userId,        // user_id — UUID, FK de todas las tablas
        emailHash,     // email_hash — SHA-256 para lookup, no es PII recuperable
        encEmail,      // email cifrado AES-GCM
        encName,       // display_name cifrado AES-GCM
        passwordHash,  // SHA-256(email:password)
        'USD',
        1,
        new Date().toISOString(),
      ];

      const sheetsService = this.injector.get(SheetsApiService);
      await firstValueFrom(sheetsService.appendRow('USERS!A1', [newUserRow]));

      // 4. Establecer sesión directamente (sin re-consultar Sheets)
      this.currentUser = { sub: userId, email: data.email, name: data.name };
      localStorage.setItem('myfinance_user', JSON.stringify(this.currentUser));
      return true;
    } catch (error) {
      console.error('[AuthService] Error en registro:', error);
      return false;
    }
  }

  /**
   * Valida credenciales contra la hoja USERS.
   * Busca por email_hash (col B) y verifica password_hash (col E).
   * Deriva la clave criptográfica del user_id (UUID) — no del email.
   */
  async login(email: string, password: string): Promise<boolean> {
    try {
      await this.signIn();

      const sheetsService = this.injector.get(SheetsApiService);
      const response = await firstValueFrom(sheetsService.getRange('USERS!A:H'));

      if (!response?.values || response.values.length < 2) return false;

      const [emailHash, passwordHash] = await Promise.all([
        this.cryptoService.hashEmail(email),
        this.cryptoService.hashPassword(email, password),
      ]);

      // Fila 0 = headers; buscar desde fila 1
      // Schema: [userId, emailHash, emailEnc, nameEnc, passwordHash, ...]
      const userRow = response.values
        .slice(1)
        .find(row => row[1] === emailHash && row[4] === passwordHash);

      if (!userRow) return false;

      const userId = userRow[0] as string;

      // Derivar clave del UUID y descifrar display_name
      await this.cryptoService.deriveKey(userId);
      const displayName = await this.cryptoService.decrypt(userRow[3] as string);

      this.currentUser = {
        sub: userId,
        email,
        name: displayName === '[DATA_ERROR]' ? email.split('@')[0] : displayName,
      };

      localStorage.setItem('myfinance_user', JSON.stringify(this.currentUser));
      return true;
    } catch (error) {
      console.error('[AuthService] Error en login:', error);
      return false;
    }
  }

  signOut(): void {
    this.accessToken = null;
    this.currentUser = null;
    this.tokenExpiry = 0;
    localStorage.removeItem('myfinance_user');
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getUser(): GoogleUser | null {
    return this.currentUser;
  }

  // ---------------------------------------------------------------------------
  // Service Account token
  // ---------------------------------------------------------------------------

  /**
   * Obtiene (o renueva) el access_token de la Service Account.
   * El token vive solo en memoria — nunca en localStorage ni en Sheets.
   */
  async signIn(): Promise<string | null> {
    if (this.isSigningIn) return this.signInPromise;
    if (!environment.googleServiceAccountEmail || !environment.googlePrivateKey) return null;
    if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken;

    this.isSigningIn = true;
    this.signInPromise = this._executeSignIn();

    try {
      return await this.signInPromise;
    } finally {
      this.isSigningIn = false;
      this.signInPromise = null;
    }
  }

  private async _executeSignIn(): Promise<string | null> {
    try {
      const jwt = this.generateJWT();
      const response: any = await firstValueFrom(
        this.bareHttp.post(
          'https://oauth2.googleapis.com/token',
          new HttpParams()
            .set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer')
            .set('assertion', jwt),
          { headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }) },
        ),
      );

      this.accessToken = response.access_token;
      this.tokenExpiry = Date.now() + response.expires_in * 1000 - 60_000;
      return this.accessToken;
    } catch (error) {
      console.error('[AuthService] Error obteniendo access_token de SA:', error);
      throw error;
    }
  }

  private generateJWT(): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: environment.googleServiceAccountEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };
    const privateKey = (environment.googlePrivateKey as string).replace(/\\n/g, '\n');
    return KJUR.jws.JWS.sign('RS256', JSON.stringify({ alg: 'RS256', typ: 'JWT' }), JSON.stringify(payload), privateKey);
  }

  getAccessToken(): string | null {
    if (this.accessToken && Date.now() > this.tokenExpiry - 300_000) {
      this.signIn().catch(() => {});
    }
    return this.accessToken;
  }

  /**
   * Verifica si un email ya está registrado en la hoja USERS.
   * Compara el SHA-256 del email con la columna email_hash (col B).
   * Retorna true si existe, false si no. Propaga errores de red.
   */
  async checkEmailExists(email: string): Promise<boolean> {
    await this.signIn();

    const sheetsService = this.injector.get(SheetsApiService);
    const response = await firstValueFrom(sheetsService.getRange('USERS!A:H'));

    if (!response?.values || response.values.length < 2) return false;

    const emailHash = await this.cryptoService.hashEmail(email);
    return response.values.slice(1).some(row => row[1] === emailHash);
  }
}
