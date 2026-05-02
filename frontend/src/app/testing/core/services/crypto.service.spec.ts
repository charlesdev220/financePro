import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { CryptoService } from '@core/services/crypto.service';

describe('CryptoService', () => {
  let spectator: SpectatorService<CryptoService>;
  const createService = createServiceFactory(CryptoService);

  const userId = 'tester@financepro.com';
  const plainText = 'Sensitive Info 123';

  beforeEach(() => {
    spectator = createService();
  });

  it('should be created', () => {
    expect(spectator.service).toBeTruthy();
  });

  it('isReady() returns false before deriveKey', () => {
    expect(spectator.service.isReady()).toBe(false);
  });

  it('deriveKey() makes the service ready', async () => {
    await spectator.service.deriveKey(userId);
    expect(spectator.service.isReady()).toBe(true);
  });

  it('encrypt/decrypt round-trip returns original text', async () => {
    await spectator.service.deriveKey(userId);
    const encrypted = await spectator.service.encrypt(plainText);
    expect(encrypted).toContain('.');
    expect(encrypted).not.toBe(plainText);
    expect(await spectator.service.decrypt(encrypted)).toBe(plainText);
  });

  it('decrypting with a different user key returns [DATA_ERROR]', async () => {
    await spectator.service.deriveKey(userId);
    const encrypted = await spectator.service.encrypt(plainText);

    await spectator.service.deriveKey('other@email.com');
    expect(await spectator.service.decrypt(encrypted)).toBe('[DATA_ERROR]');
  });

  it('encrypt() throws if key not initialized', async () => {
    await expect(spectator.service.encrypt('foo')).rejects.toThrow('CryptoKey no inicializada.');
  });

  it('decrypt() throws if key not initialized', async () => {
    await expect(spectator.service.decrypt('foo')).rejects.toThrow('CryptoKey no inicializada.');
  });

  it('decrypt() returns input if not in valid format (missing dot)', async () => {
    await spectator.service.deriveKey(userId);
    expect(await spectator.service.decrypt('invalid_format')).toBe('invalid_format');
  });

  describe('hashEmail()', () => {
    it('returns a 64-char hex string', async () => {
      const hash = await spectator.service.hashEmail('user@test.com');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is case-insensitive (normalizes to lowercase)', async () => {
      const h1 = await spectator.service.hashEmail('User@Test.COM');
      const h2 = await spectator.service.hashEmail('user@test.com');
      expect(h1).toBe(h2);
    });

    it('different emails produce different hashes', async () => {
      const h1 = await spectator.service.hashEmail('a@test.com');
      const h2 = await spectator.service.hashEmail('b@test.com');
      expect(h1).not.toBe(h2);
    });
  });

  describe('hashPassword()', () => {
    it('returns a 64-char hex string', async () => {
      const hash = await spectator.service.hashPassword(userId, 'mySecret');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('same inputs produce same hash (deterministic)', async () => {
      const h1 = await spectator.service.hashPassword(userId, 'mySecret');
      const h2 = await spectator.service.hashPassword(userId, 'mySecret');
      expect(h1).toBe(h2);
    });

    it('different passwords produce different hashes', async () => {
      const h1 = await spectator.service.hashPassword(userId, 'correct');
      const h2 = await spectator.service.hashPassword(userId, 'wrong');
      expect(h1).not.toBe(h2);
    });

    it('same password with different email produces different hash', async () => {
      const h1 = await spectator.service.hashPassword('a@test.com', 'pass');
      const h2 = await spectator.service.hashPassword('b@test.com', 'pass');
      expect(h1).not.toBe(h2);
    });
  });
});
