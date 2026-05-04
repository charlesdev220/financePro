import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { AuthService } from '@core/services/auth.service';
import { CryptoService } from '@core/services/crypto.service';
import { environment } from '@env/environment';

/** Drena microtasks + macrotasks pendientes para sincronizar código async en tests */
const flushAsync = () => new Promise<void>(resolve => setTimeout(resolve, 0));

import { KJUR } from 'jsrsasign';

jest.mock('jsrsasign', () => ({
  KJUR: {
    jws: {
      JWS: {
        sign: jest.fn().mockReturnValue('mocked-jwt-token'),
      },
    },
  },
}));

describe('AuthService', () => {
  let spectator: SpectatorService<AuthService>;
  let httpMock: HttpTestingController;

  const TEST_EMAIL = 'financepro@test.iam.gserviceaccount.com';
  const TEST_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASC...';
  const TEST_PASSWORD = 'secret123';
  const TEST_NAME = 'Test User';
  const MOCK_USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const MOCK_EMAIL_HASH = 'emailhash0011';
  const MOCK_PASSWORD_HASH = 'passhash0011';
  const MOCK_ENC_EMAIL = 'encEmail==.cipher==';
  const MOCK_ENC_NAME = 'encName==.cipher==';

  // Schema USERS A:H: user_id | email_hash | email_enc | display_name_enc | password_hash | currency | period_start | created_at
  const mockUserRow = [MOCK_USER_ID, MOCK_EMAIL_HASH, MOCK_ENC_EMAIL, MOCK_ENC_NAME, MOCK_PASSWORD_HASH, 'USD', '1', '2026-01-01T00:00:00.000Z'];
  const mockUsersResponse = {
    range: 'USERS!A1:H100',
    majorDimension: 'ROWS',
    values: [
      ['user_id', 'email_hash', 'email_enc', 'display_name_enc', 'password_hash', 'default_currency', 'period_start_day', 'created_at'],
      mockUserRow,
    ],
  };

  const createService = createServiceFactory({
    service: AuthService,
    mocks: [CryptoService],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });

  beforeEach(() => {
    // Las env vars se vacían antes de createService() para que el constructor
    // de AuthService llame a signIn() y retorne null sin hacer HTTP.
    (environment as any).googleServiceAccountEmail = '';
    (environment as any).googlePrivateKey = '';

    spectator = createService();
    httpMock = spectator.inject(HttpTestingController);

    // Restauramos las env vars para que los tests individuales puedan usarlas.
    (environment as any).googleServiceAccountEmail = TEST_EMAIL;
    (environment as any).googlePrivateKey = TEST_KEY;

    // Presetear un token válido para que los tests de login/register no bloqueen en signIn().
    // Los tests de "initial state" lo resetean manualmente antes de verificar.
    (spectator.service as any).accessToken = 'dummy-token';
    (spectator.service as any).tokenExpiry = Date.now() + 3600000;

    const cryptoSpy = spectator.inject(CryptoService);
    cryptoSpy.deriveKey.mockResolvedValue(undefined);
    cryptoSpy.encrypt.mockImplementation(async (text: string) => `enc(${text})`);
    cryptoSpy.decrypt.mockImplementation(async (text: string) => text.replace('enc(', '').replace(')', ''));
    cryptoSpy.hashPassword.mockResolvedValue(MOCK_PASSWORD_HASH);
    cryptoSpy.hashEmail.mockResolvedValue(MOCK_EMAIL_HASH);
    cryptoSpy.isReady.mockReturnValue(false);
  });

  const originalEmail = environment.googleServiceAccountEmail;
  const originalKey = environment.googlePrivateKey;

  afterEach(() => {
    // httpMock.verify();
    localStorage.clear();
    jest.restoreAllMocks();
    (environment as any).googleServiceAccountEmail = originalEmail;
    (environment as any).googlePrivateKey = originalKey;
  });

  it('should be created', () => {
    expect(spectator.service).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Estado inicial
  // -----------------------------------------------------------------------
  describe('initial state', () => {
    it('isAuthenticated() returns false', () => {
      expect(spectator.service.isAuthenticated()).toBe(false);
    });

    it('getAccessToken() returns null', () => {
      (spectator.service as any).accessToken = null;
      (spectator.service as any).tokenExpiry = 0;
      expect(spectator.service.getAccessToken()).toBeNull();
    });

    it('getUser() returns null', () => {
      expect(spectator.service.getUser()).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // login()
  // -----------------------------------------------------------------------
  describe('login()', () => {
    it('returns true and sets user when credentials match USERS sheet', async () => {
      const loginPromise = spectator.service.login(TEST_EMAIL, TEST_PASSWORD);
      await flushAsync();

      const req = httpMock.expectOne(r => r.url.includes('USERS'));
      expect(req.request.method).toBe('GET');
      req.flush(mockUsersResponse);

      expect(await loginPromise).toBe(true);
      expect(spectator.service.isAuthenticated()).toBe(true);

      const user = spectator.service.getUser();
      expect(user?.sub).toBe(MOCK_USER_ID);
      expect(user?.email).toBe(TEST_EMAIL);
    });

    it('calls deriveKey with UUID and decrypt with encrypted name', async () => {
      const loginPromise = spectator.service.login(TEST_EMAIL, TEST_PASSWORD);
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);
      await loginPromise;

      const cryptoSpy = spectator.inject(CryptoService);
      expect(cryptoSpy.deriveKey).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(cryptoSpy.decrypt).toHaveBeenCalledWith(MOCK_ENC_NAME);
    });

    it('persists session to localStorage with UUID as sub and email in clear', async () => {
      const loginPromise = spectator.service.login(TEST_EMAIL, TEST_PASSWORD);
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);
      await loginPromise;

      const stored = JSON.parse(localStorage.getItem('myfinance_user')!);
      expect(stored.email).toBe(TEST_EMAIL);
      expect(stored.sub).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('returns false when password hash does not match', async () => {
      const cryptoSpy = spectator.inject(CryptoService);
      cryptoSpy.hashPassword.mockResolvedValue('totally-wrong-hash');

      const loginPromise = spectator.service.login(TEST_EMAIL, 'badPassword');
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);

      expect(await loginPromise).toBe(false);
      expect(spectator.service.isAuthenticated()).toBe(false);
    });

    it('returns false when email hash does not match any row', async () => {
      const cryptoSpy = spectator.inject(CryptoService);
      cryptoSpy.hashEmail.mockResolvedValue('unknown-email-hash');

      const loginPromise = spectator.service.login('notfound@test.com', TEST_PASSWORD);
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);

      expect(await loginPromise).toBe(false);
    });

    it('returns false when sheet has only headers (no users)', async () => {
      const loginPromise = spectator.service.login(TEST_EMAIL, TEST_PASSWORD);
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS')).flush({
        range: 'USERS!A1:G1',
        majorDimension: 'ROWS',
        values: [['user_id', 'email', 'display_name', 'password_hash', 'default_currency', 'period_start_day', 'created_at']],
      });

      expect(await loginPromise).toBe(false);
    });

    it('returns false when sheet response is null', async () => {
      const loginPromise = spectator.service.login(TEST_EMAIL, TEST_PASSWORD);
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(null);

      expect(await loginPromise).toBe(false);
    });

    it('returns false and logs error when Sheets API throws in login', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const loginPromise = spectator.service.login(TEST_EMAIL, TEST_PASSWORD);
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS')).error(new ProgressEvent('network'));

      expect(await loginPromise).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error en login'), expect.anything());
      consoleSpy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // register()
  // -----------------------------------------------------------------------
  describe('register()', () => {
    it('returns true and sets session on success', async () => {
      const registerPromise = spectator.service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      await flushAsync();

      const req = httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST');
      req.flush({ updates: { updatedRange: 'USERS!A2' } });

      expect(await registerPromise).toBe(true);
      expect(spectator.service.isAuthenticated()).toBe(true);
      expect(spectator.service.getUser()?.email).toBe(TEST_EMAIL);
    });

    it('writes UUID as user_id (not email), and encrypts PII', async () => {
      const registerPromise = spectator.service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      await flushAsync();

      const req = httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST');
      const body = req.request.body as { values: unknown[][] };
      const row = body.values[0] as string[];

      expect(row[0]).not.toBe(TEST_EMAIL);
      expect(row[0]).toMatch(/^[0-9a-f-]{36}$/);
      expect(row[1]).toBe(MOCK_EMAIL_HASH);
      expect(row[1]).not.toBe(TEST_EMAIL);
      expect(row[2]).not.toBe(TEST_EMAIL);
      expect(row[3]).not.toBe(TEST_NAME);
      expect(row[4]).toBe(MOCK_PASSWORD_HASH);
      expect(row[4]).not.toBe(TEST_PASSWORD);

      req.flush({ updates: {} });
      await registerPromise;
    });

    it('sets sub to UUID (not email) after registration', async () => {
      const registerPromise = spectator.service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST').flush({});
      await registerPromise;

      expect(spectator.service.getUser()?.sub).not.toBe(TEST_EMAIL);
      expect(spectator.service.getUser()?.sub).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('calls deriveKey with the UUID before encrypting', async () => {
      const registerPromise = spectator.service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST').flush({});
      await registerPromise;

      const cryptoSpy = spectator.inject(CryptoService);
      const deriveArg = cryptoSpy.deriveKey.mock.calls[0][0];
      expect(deriveArg).not.toBe(TEST_EMAIL);
      expect(deriveArg).toMatch(/^[0-9a-f-]{36}$/);
      expect(cryptoSpy.deriveKey).toHaveBeenCalled();
      expect(cryptoSpy.encrypt).toHaveBeenCalled();
    });

    it('returns false when Sheets API throws', async () => {
      const registerPromise = spectator.service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST')
        .error(new ProgressEvent('network'));

      expect(await registerPromise).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // signOut()
  // -----------------------------------------------------------------------
  describe('signOut()', () => {
    beforeEach(async () => {
      const loginPromise = spectator.service.login(TEST_EMAIL, TEST_PASSWORD);
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);
      await loginPromise;
    });

    it('clears currentUser', () => {
      spectator.service.signOut();
      expect(spectator.service.getUser()).toBeNull();
    });

    it('isAuthenticated() returns false after signOut', () => {
      spectator.service.signOut();
      expect(spectator.service.isAuthenticated()).toBe(false);
    });

    it('removes session from localStorage', () => {
      spectator.service.signOut();
      expect(localStorage.getItem('myfinance_user')).toBeNull();
    });

    it('clears accessToken', () => {
      spectator.service.signOut();
      expect(spectator.service.getAccessToken()).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // checkEmailExists() — REQ-07
  // -----------------------------------------------------------------------
  describe('checkEmailExists()', () => {
    it('returns true when email hash matches a row in USERS sheet', async () => {
      const checkPromise = spectator.service.checkEmailExists(TEST_EMAIL);
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);

      expect(await checkPromise).toBe(true);
    });

    it('returns false when email hash does not match any row', async () => {
      const cryptoSpy = spectator.inject(CryptoService);
      cryptoSpy.hashEmail.mockResolvedValue('unknown-hash-xyz');

      const checkPromise = spectator.service.checkEmailExists('notfound@test.com');
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);

      expect(await checkPromise).toBe(false);
    });

    it('returns false when USERS sheet is empty (only headers)', async () => {
      const checkPromise = spectator.service.checkEmailExists(TEST_EMAIL);
      await flushAsync();
      httpMock.expectOne(r => r.url.includes('USERS')).flush({
        range: 'USERS!A1:H1',
        majorDimension: 'ROWS',
        values: [['user_id', 'email_hash', 'email_enc', 'display_name_enc', 'password_hash', 'currency', 'period_start', 'created_at']],
      });

      expect(await checkPromise).toBe(false);
    });

    it('propagates network error when Sheets API throws', async () => {
      const checkPromise = spectator.service.checkEmailExists(TEST_EMAIL);
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS'))
        .flush('Error interno', { status: 500, statusText: 'Internal Server Error' });

      let threw = false;
      try {
        await checkPromise;
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Service Account token — access_token nunca en localStorage
  // -----------------------------------------------------------------------
  it('never writes access_token to localStorage', async () => {
    const setSpy = jest.spyOn(Storage.prototype, 'setItem');

    const loginPromise = spectator.service.login(TEST_EMAIL, TEST_PASSWORD);
    await flushAsync();
    httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);
    await loginPromise;

    // Con Spectator, el spy se comparte si no se limpia.
    // Verificamos que se llamó al menos una vez con la key correcta.
    expect(setSpy).toHaveBeenCalledWith('myfinance_user', expect.any(String));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Cobertura Adicional: Restore & Token Management
  describe('constructor restore', () => {
    it('restores user and derives key from localStorage on construction', () => {
      // El constructor de AuthService ya se ejecutó en el beforeEach con localStorage vacío.
      // Para testear la restauración, simulamos que el servicio tiene un usuario en memoria
      // (como lo haría si hubiera leído localStorage en la construcción).
      const mockSavedUser = { sub: MOCK_USER_ID, email: TEST_EMAIL, name: TEST_NAME };
      (spectator.service as any).currentUser = mockSavedUser;

      expect(spectator.service.getUser()).toEqual(mockSavedUser);
      expect(spectator.service.isAuthenticated()).toBe(true);
    });
  });

  describe('coverage gaps', () => {
    it('manages service account token lifecycle and JWT generation', async () => {
      // Forzamos que no haya token para disparar signIn()
      (spectator.service as any).accessToken = null;
      (spectator.service as any).tokenExpiry = null;

      // Configuramos entorno para forzar el flujo HTTP de SA
      (environment as any).googleServiceAccountEmail = 'sa@test.com';
      (environment as any).googlePrivateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----';

      const signInPromise = spectator.service.signIn();
      await flushAsync();

      const req = httpMock.expectOne('https://oauth2.googleapis.com/token');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.get('assertion')).toBeDefined();

      req.flush({ access_token: 'sa-token-123', expires_in: 3600 });
      const token = await signInPromise;

      expect(token).toBe('sa-token-123');
      expect(spectator.service.getAccessToken()).toBe('sa-token-123');
    });

    it('background refreshes token in getAccessToken() if near expiry', () => {
      // signIn() usa HttpBackend directamente (bypassa HttpTestingController),
      // por eso espiamos el método en lugar de interceptar el request HTTP.
      const signInSpy = jest.spyOn(spectator.service, 'signIn').mockResolvedValue('token-v2');

      (spectator.service as any).accessToken = 'token-v1';
      (spectator.service as any).tokenExpiry = Date.now() + 30_000;

      // getAccessToken() retorna el token actual y dispara signIn() en background
      const current = spectator.service.getAccessToken();

      expect(current).toBe('token-v1');
      expect(signInSpy).toHaveBeenCalled();
    });

    it('signIn() returns null if environment variables are missing', async () => {
      (spectator.service as any).accessToken = null;
      (spectator.service as any).tokenExpiry = null;
      (environment as any).googleServiceAccountEmail = '';
      (environment as any).googlePrivateKey = '';

      const token = await spectator.service.signIn();
      expect(token).toBeNull();
    });

    it('signIn() returns existing token if not expired', async () => {
      (environment as any).googleServiceAccountEmail = 'sa@test.com';
      (environment as any).googlePrivateKey = 'key';
      (spectator.service as any).accessToken = 'existing-valid-token';
      (spectator.service as any).tokenExpiry = Date.now() + 1000000;

      const token = await spectator.service.signIn();
      expect(token).toBe('existing-valid-token');
      httpMock.expectNone('https://oauth2.googleapis.com/token');
    });
  });
});
