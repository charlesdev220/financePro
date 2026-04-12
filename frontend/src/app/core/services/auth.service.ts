import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GoogleUser {
  sub: string;
  email: string;
  name: string;
}

// GIS se carga via script tag en index.html — se declara para TypeScript
declare const google: any;

/**
 * AuthService — autenticación con Google Identity Services (GIS).
 *
 * Flujo:
 *   1. signIn() abre el popup OAuth2 de Google
 *   2. handleTokenResponse() almacena el access_token in-memory
 *   3. handleTokenResponse() llama a /userinfo para obtener sub, email, name
 *   4. signOut() revoca el token y limpia el estado
 *
 * El access_token NUNCA se persiste en localStorage, sessionStorage ni cookies.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private accessToken: string | null = null;
  private currentUser: GoogleUser | null = null;
  private tokenClient: any = null;

  constructor() {
    this.initTokenClient();
  }

  private initTokenClient(): void {
    if (typeof google === 'undefined' || !environment.googleClientId) {
      return;
    }

    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: environment.googleClientId,
      scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets',
      callback: (response: any) => this.handleTokenResponse(response),
    });
  }

  /**
   * Abre el popup OAuth2 de Google.
   * El resultado llega de forma asíncrona en handleTokenResponse().
   */
  signIn(): void {
    if (!this.tokenClient) {
      console.error('[AuthService] GIS no inicializado. Verificar googleClientId en environment.ts');
      return;
    }
    this.tokenClient.requestAccessToken();
  }

  private async handleTokenResponse(response: any): Promise<void> {
    if (response.error) {
      console.error('[AuthService] Error en OAuth2:', response.error);
      return;
    }

    this.accessToken = response.access_token;

    try {
      const userInfo = await firstValueFrom(
        this.http.get<GoogleUser>('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }),
      );
      this.currentUser = {
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
      };
    } catch (err) {
      console.error('[AuthService] Error obteniendo userinfo:', err);
      this.accessToken = null;
    }
  }

  /**
   * Revoca el token en Google y limpia el estado in-memory.
   */
  signOut(): void {
    if (this.accessToken) {
      google.accounts.oauth2.revoke(this.accessToken, () => {});
    }
    this.accessToken = null;
    this.currentUser = null;
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getUser(): GoogleUser | null {
    return this.currentUser;
  }
}
