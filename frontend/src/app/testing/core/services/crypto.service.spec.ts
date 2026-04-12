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

  // REQ-07: derivación determinista
  describe('deriveKey()', () => {
    it('produces equivalent keys for the same userId (same encrypt output)', async () => {
      const key1 = await service.deriveKey('google-sub-12345');
      const key2 = await service.deriveKey('google-sub-12345');
      const plaintext = 'test@example.com';

      // Las dos claves producen el mismo descifrado sobre el mismo ciphertext
      const cipher = await service.encrypt(plaintext, key1);
      const decrypted = await service.decrypt(cipher, key2);

      expect(decrypted).toBe(plaintext);
    });

    it('produces different results for different userIds', async () => {
      const keyA = await service.deriveKey('sub-A');
      const keyB = await service.deriveKey('sub-B');
      const plaintext = 'test@example.com';

      const cipherA = await service.encrypt(plaintext, keyA);

      await expectAsync(service.decrypt(cipherA, keyB)).toBeRejected();
    });
  });

  // REQ-08: cifrado AES-GCM
  describe('encrypt()', () => {
    it('produces different Base64 output each call (random IV)', async () => {
      const key = await service.deriveKey('sub-test');
      const plaintext = 'test@example.com';

      const cipher1 = await service.encrypt(plaintext, key);
      const cipher2 = await service.encrypt(plaintext, key);

      expect(cipher1).not.toBe(cipher2);
    });

    it('returns a valid Base64 string', async () => {
      const key = await service.deriveKey('sub-test');
      const result = await service.encrypt('test@example.com', key);

      expect(() => atob(result)).not.toThrow();
    });
  });

  // REQ-09: descifrado AES-GCM
  describe('decrypt()', () => {
    it('round-trip: encrypt → decrypt returns the original string', async () => {
      const key = await service.deriveKey('sub-roundtrip');
      const original = 'usuario@gmail.com';

      const cipher = await service.encrypt(original, key);
      const decrypted = await service.decrypt(cipher, key);

      expect(decrypted).toBe(original);
    });

    it('fails when decrypting with a key from a different userId', async () => {
      const keyA = await service.deriveKey('sub-A');
      const keyB = await service.deriveKey('sub-B');

      const cipher = await service.encrypt('secreto@gmail.com', keyA);

      await expectAsync(service.decrypt(cipher, keyB)).toBeRejected();
    });

    it('fails when ciphertext is corrupted', async () => {
      const key = await service.deriveKey('sub-test');
      const corruptedBase64 = btoa('esto-no-es-un-ciphertext-valido-xxxxxxxxx');

      await expectAsync(service.decrypt(corruptedBase64, key)).toBeRejected();
    });
  });
});
