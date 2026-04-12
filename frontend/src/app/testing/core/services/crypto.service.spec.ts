import { TestBed } from '@angular/core/testing';
import { CryptoService } from '../../../core/services/crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;
  const userId = 'tester@financepro.com';
  const plainText = 'Sensitive Info 123';

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CryptoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isReady() returns false before deriveKey', () => {
    expect(service.isReady()).toBeFalse();
  });

  it('deriveKey() makes the service ready', async () => {
    await service.deriveKey(userId);
    expect(service.isReady()).toBeTrue();
  });

  it('encrypt/decrypt round-trip returns original text', async () => {
    await service.deriveKey(userId);
    const encrypted = await service.encrypt(plainText);
    expect(encrypted).toContain('.');
    expect(encrypted).not.toBe(plainText);
    expect(await service.decrypt(encrypted)).toBe(plainText);
  });

  it('decrypting with a different user key returns [DATA_ERROR]', async () => {
    await service.deriveKey(userId);
    const encrypted = await service.encrypt(plainText);

    await service.deriveKey('other@email.com');
    expect(await service.decrypt(encrypted)).toBe('[DATA_ERROR]');
  });

  it('encrypt() throws if key not initialized', async () => {
    await expectAsync(service.encrypt('foo')).toBeRejectedWithError('CryptoKey no inicializada.');
  });

  describe('hashEmail()', () => {
    it('returns a 64-char hex string', async () => {
      const hash = await service.hashEmail('user@test.com');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is case-insensitive (normalizes to lowercase)', async () => {
      const h1 = await service.hashEmail('User@Test.COM');
      const h2 = await service.hashEmail('user@test.com');
      expect(h1).toBe(h2);
    });

    it('different emails produce different hashes', async () => {
      const h1 = await service.hashEmail('a@test.com');
      const h2 = await service.hashEmail('b@test.com');
      expect(h1).not.toBe(h2);
    });
  });

  describe('hashPassword()', () => {
    it('returns a 64-char hex string', async () => {
      const hash = await service.hashPassword(userId, 'mySecret');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('same inputs produce same hash (deterministic)', async () => {
      const h1 = await service.hashPassword(userId, 'mySecret');
      const h2 = await service.hashPassword(userId, 'mySecret');
      expect(h1).toBe(h2);
    });

    it('different passwords produce different hashes', async () => {
      const h1 = await service.hashPassword(userId, 'correct');
      const h2 = await service.hashPassword(userId, 'wrong');
      expect(h1).not.toBe(h2);
    });

    it('same password with different email produces different hash', async () => {
      const h1 = await service.hashPassword('a@test.com', 'pass');
      const h2 = await service.hashPassword('b@test.com', 'pass');
      expect(h1).not.toBe(h2);
    });
  });
});
