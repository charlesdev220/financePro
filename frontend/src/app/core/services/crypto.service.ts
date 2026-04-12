import { Injectable } from '@angular/core';

/**
 * CryptoService — cifrado AES-GCM de PII usando Web Crypto API (nativa del browser).
 *
 * La clave se deriva del `sub` de Google del usuario mediante PBKDF2.
 * Mismo userId → misma clave determinista. Nunca se persiste la clave.
 *
 * Uso:
 *   const key = await cryptoService.deriveKey(user.sub);
 *   const cipher = await cryptoService.encrypt(user.email, key);
 *   const plain  = await cryptoService.decrypt(cipher, key);
 */
@Injectable({ providedIn: 'root' })
export class CryptoService {

  /**
   * Deriva una CryptoKey AES-GCM 256 bits desde el userId (sub de Google).
   * PBKDF2: salt = userId, 100.000 iteraciones, SHA-256.
   */
  async deriveKey(userId: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(userId),
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(userId),
        iterations: 100_000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Cifra un string con AES-GCM.
   * Retorna Base64( IV[12B] || ciphertext ).
   * El IV es aleatorio en cada llamada — nunca reutilizado.
   */
  async encrypt(plaintext: string, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded,
    );

    const result = new Uint8Array(12 + cipherBuffer.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(cipherBuffer), 12);

    return btoa(String.fromCharCode(...result));
  }

  /**
   * Descifra un string producido por `encrypt()`.
   * Lanza si la clave es incorrecta o el ciphertext está corrupto.
   */
  async decrypt(ciphertext: string, key: CryptoKey): Promise<string> {
    const bytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data,
    );

    return new TextDecoder().decode(plainBuffer);
  }
}
