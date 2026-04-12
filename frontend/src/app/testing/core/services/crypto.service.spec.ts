import { TestBed } from '@angular/core/testing';
import { CryptoService } from '../../../core/services/crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CryptoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // REQ-07: derivación determinista — misma userId → misma clave (mismos resultados de cifrado)
  describe('deriveKey()', () => {
    it('initializes the service so encrypt/decrypt work', async () => {
      await service.deriveKey('google-sub-12345');
      expect(service.isReady()).toBeTrue();
    });

    it('produces the same round-trip result when derived twice with the same userId', async () => {
      const plaintext = 'test@example.com';

      await service.deriveKey('google-sub-12345');
      const cipher = await service.encrypt(plaintext);

      await service.deriveKey('google-sub-12345');
      const decrypted = await service.decrypt(cipher);

      expect(decrypted).toBe(plaintext);
    });

    it('fails to decrypt with a different userId', async () => {
      await service.deriveKey('sub-A');
      const cipher = await service.encrypt('test@example.com');

      await service.deriveKey('sub-B');
      const result = await service.decrypt(cipher);

      // decrypt devuelve '[DATA_ERROR]' cuando la clave no coincide
      expect(result).toBe('[DATA_ERROR]');
    });
  });

  // REQ-08: cifrado AES-GCM
  describe('encrypt()', () => {
    it('produces different Base64 output each call (random IV)', async () => {
      await service.deriveKey('sub-test');
      const plaintext = 'test@example.com';

      const cipher1 = await service.encrypt(plaintext);
      const cipher2 = await service.encrypt(plaintext);

      expect(cipher1).not.toBe(cipher2);
    });

    it('returns a "ivBase64.cipherBase64" formatted string', async () => {
      await service.deriveKey('sub-test');
      const result = await service.encrypt('test@example.com');

      expect(result).toContain('.');
      const [ivPart, cipherPart] = result.split('.');
      expect(() => atob(ivPart)).not.toThrow();
      expect(() => atob(cipherPart)).not.toThrow();
    });
  });

  // REQ-09: descifrado AES-GCM
  describe('decrypt()', () => {
    it('round-trip: encrypt → decrypt returns the original string', async () => {
      await service.deriveKey('sub-roundtrip');
      const original = 'usuario@gmail.com';

      const cipher = await service.encrypt(original);
      const decrypted = await service.decrypt(cipher);

      expect(decrypted).toBe(original);
    });

    it('returns [DATA_ERROR] when ciphertext is corrupted', async () => {
      await service.deriveKey('sub-test');
      const result = await service.decrypt('invalid.data');
      expect(result).toBe('[DATA_ERROR]');
    });
  });

  // hashPassword y hashEmail son independientes de deriveKey
  describe('hashPassword()', () => {
    it('returns a hex SHA-256 string', async () => {
      const hash = await service.hashPassword('user@example.com', 'secret123');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic', async () => {
      const h1 = await service.hashPassword('user@example.com', 'secret123');
      const h2 = await service.hashPassword('user@example.com', 'secret123');
      expect(h1).toBe(h2);
    });
  });

  describe('hashEmail()', () => {
    it('returns a hex SHA-256 string', async () => {
      const hash = await service.hashEmail('User@Example.COM');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is case-insensitive (normalizes to lowercase)', async () => {
      const h1 = await service.hashEmail('User@Example.COM');
      const h2 = await service.hashEmail('user@example.com');
      expect(h1).toBe(h2);
    });
  });
});
