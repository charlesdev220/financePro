import { Injectable } from '@angular/core';

/**
 * CryptoService — Único punto de cifrado/descifrado de PII.
 * AES-GCM 256 · PBKDF2 100k iter · salt dinámico por usuario · Web Crypto API
 */
@Injectable({ providedIn: 'root' })
export class CryptoService {
  private readonly ALGO = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly ITERATIONS = 100_000;

  private cryptoKey: CryptoKey | null = null;

  /**
   * Deriva la clave AES-GCM a partir del userId (email).
   * El salt es dinámico: bytes del propio userId → clave única por usuario.
   */
  async deriveKey(userId: string): Promise<void> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(userId),
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    this.cryptoKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(userId), // salt dinámico = userId
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.ALGO, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Cifra texto plano. Devuelve "ivBase64.cipherBase64".
   */
  async encrypt(text: string): Promise<string> {
    if (!this.cryptoKey) throw new Error('CryptoKey no inicializada.');

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: this.ALGO, iv },
      this.cryptoKey,
      encoded,
    );

    const ivBase64 = btoa(String.fromCharCode(...iv));
    const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
    return `${ivBase64}.${cipherBase64}`;
  }

  /**
   * Descifra una cadena "ivBase64.cipherBase64".
   * Retorna '[DATA_ERROR]' si falla (clave incorrecta o datos corruptos).
   */
  async decrypt(encryptedData: string): Promise<string> {
    if (!this.cryptoKey) throw new Error('CryptoKey no inicializada.');

    const [ivBase64, cipherBase64] = encryptedData.split('.');
    if (!ivBase64 || !cipherBase64) return encryptedData;

    try {
      const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
      const ciphertext = new Uint8Array(atob(cipherBase64).split('').map(c => c.charCodeAt(0)));
      const decrypted = await window.crypto.subtle.decrypt(
        { name: this.ALGO, iv },
        this.cryptoKey,
        ciphertext,
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      return '[DATA_ERROR]';
    }
  }

  /**
   * Hash de contraseña: SHA-256(email + ":" + password).
   * Independiente de deriveKey — no requiere clave inicializada.
   */
  async hashPassword(email: string, password: string): Promise<string> {
    return this._sha256(`${email}:${password}`);
  }

  /**
   * Hash de email para búsqueda en USERS sin exponer el valor en claro.
   * SHA-256(email.toLowerCase()) — no es PII recuperable.
   */
  async hashEmail(email: string): Promise<string> {
    return this._sha256(email.toLowerCase().trim());
  }

  private async _sha256(value: string): Promise<string> {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  isReady(): boolean {
    return this.cryptoKey !== null;
  }
}
