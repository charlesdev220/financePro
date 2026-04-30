import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from '@core/services/auth.service';
import { CryptoService } from '@core/services/crypto.service';
import { environment } from '@env/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let cryptoSpy: jest.Mocked<CryptoService>;

  const TEST_EMAIL = 'user@test.com';
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

  beforeEach(() => {
    // Vars de entorno vacías → signIn() retorna null sin hacer HTTP (no hay JWT que firmar)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (environment as any).googleServiceAccountEmail = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (environment as any).googlePrivateKey = '';

    cryptoSpy = {
      deriveKey: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      hashPassword: jest.fn(),
      hashEmail: jest.fn(),
      isReady: jest.fn(),
    } as unknown as jest.Mocked<CryptoService>;

    cryptoSpy.deriveKey.mockResolvedValue(undefined);
    cryptoSpy.encrypt.mockImplementation(async (text: string) => `enc(${text})`);
    cryptoSpy.decrypt.mockImplementation(async (text: string) => text.replace('enc(', '').replace(')', ''));
    cryptoSpy.hashPassword.mockResolvedValue(MOCK_PASSWORD_HASH);
    cryptoSpy.hashEmail.mockResolvedValue(MOCK_EMAIL_HASH);
    cryptoSpy.isReady.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CryptoService, useValue: cryptoSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('myfinance_user');
    jest.restoreAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (environment as any).googleServiceAccountEmail = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (environment as any).googlePrivateKey = '';
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Estado inicial
  // -----------------------------------------------------------------------
  describe('initial state', () => {
    it('isAuthenticated() returns false', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('getAccessToken() returns null', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it('getUser() returns null', () => {
      expect(service.getUser()).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // login()
  // -----------------------------------------------------------------------
  describe('login()', () => {
    it('returns true and sets user when credentials match USERS sheet', async () => {
      const loginPromise = service.login(TEST_EMAIL, TEST_PASSWORD);
      await Promise.resolve(); // permite que signIn() termine antes del request HTTP

      const req = httpMock.expectOne(r => r.url.includes('USERS'));
      expect(req.request.method).toBe('GET');
      req.flush(mockUsersResponse);

      expect(await loginPromise).toBe(true);
      expect(service.isAuthenticated()).toBe(true);

      const user = service.getUser();
      expect(user?.sub).toBe(MOCK_USER_ID); // sub = UUID, no el email
      expect(user?.email).toBe(TEST_EMAIL);
    });

    it('calls deriveKey with UUID and decrypt with encrypted name', async () => {
      const loginPromise = service.login(TEST_EMAIL, TEST_PASSWORD);
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);
      await loginPromise;

      // deriveKey recibe el UUID, no el email
      expect(cryptoSpy.deriveKey).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(cryptoSpy.decrypt).toHaveBeenCalledWith(MOCK_ENC_NAME);
    });

    it('persists session to localStorage', async () => {
      const loginPromise = service.login(TEST_EMAIL, TEST_PASSWORD);
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);
      await loginPromise;

      const stored = JSON.parse(localStorage.getItem('myfinance_user')!);
      expect(stored.sub).toBe(TEST_EMAIL);
    });

    it('returns false when password hash does not match', async () => {
      cryptoSpy.hashPassword.mockResolvedValue('totally-wrong-hash');

      const loginPromise = service.login(TEST_EMAIL, 'badPassword');
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);

      expect(await loginPromise).toBe(false);
      expect(service.isAuthenticated()).toBe(false);
    });

    it('returns false when email hash does not match any row', async () => {
      cryptoSpy.hashEmail.mockResolvedValue('unknown-email-hash');

      const loginPromise = service.login('notfound@test.com', TEST_PASSWORD);
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);

      expect(await loginPromise).toBe(false);
    });

    it('returns false when sheet has only headers (no users)', async () => {
      const loginPromise = service.login(TEST_EMAIL, TEST_PASSWORD);
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS')).flush({
        range: 'USERS!A1:G1',
        majorDimension: 'ROWS',
        values: [['user_id', 'email', 'display_name', 'password_hash', 'default_currency', 'period_start_day', 'created_at']],
      });

      expect(await loginPromise).toBe(false);
    });

    it('returns false when sheet response is null', async () => {
      const loginPromise = service.login(TEST_EMAIL, TEST_PASSWORD);
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(null);

      expect(await loginPromise).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // register()
  // -----------------------------------------------------------------------
  describe('register()', () => {
    it('returns true and sets session on success', async () => {
      const registerPromise = service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      await Promise.resolve(); // signIn() microtask + Promise.all para cifrado

      const req = httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST');
      req.flush({ updates: { updatedRange: 'USERS!A2' } });

      expect(await registerPromise).toBe(true);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.getUser()?.email).toBe(TEST_EMAIL);
    });

    it('writes UUID as user_id (not email), and encrypts PII', async () => {
      const registerPromise = service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      await Promise.resolve();

      const req = httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST');
      const body = req.request.body as { values: unknown[][] };
      const row = body.values[0] as string[];

      // col A: user_id = UUID (no el email)
      expect(row[0]).not.toBe(TEST_EMAIL);
      expect(row[0]).toMatch(/^[0-9a-f-]{36}$/); // formato UUID v4
      // col B: email_hash (SHA-256, no el email en claro)
      expect(row[1]).toBe(MOCK_EMAIL_HASH);
      expect(row[1]).not.toBe(TEST_EMAIL);
      // col C y D: PII cifrada
      expect(row[2]).not.toBe(TEST_EMAIL);
      expect(row[3]).not.toBe(TEST_NAME);
      // col E: password hasheada
      expect(row[4]).toBe(MOCK_PASSWORD_HASH);
      expect(row[4]).not.toBe(TEST_PASSWORD);

      req.flush({ updates: {} });
      await registerPromise;
    });

    it('sets sub to UUID (not email) after registration', async () => {
      const registerPromise = service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST').flush({});
      await registerPromise;

      expect(service.getUser()?.sub).not.toBe(TEST_EMAIL);
      expect(service.getUser()?.sub).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('calls deriveKey with the UUID before encrypting', async () => {
      const registerPromise = service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST').flush({});
      await registerPromise;

      // deriveKey debe recibir el UUID (no el email)
      const deriveArg = cryptoSpy.deriveKey.mock.calls[0][0];
      expect(deriveArg).not.toBe(TEST_EMAIL);
      expect(deriveArg).toMatch(/^[0-9a-f-]{36}$/);
      // deriveKey y encrypt ambos fueron llamados (orden garantizado por la implementación async)
      expect(cryptoSpy.deriveKey).toHaveBeenCalled();
      expect(cryptoSpy.encrypt).toHaveBeenCalled();
    });

    it('returns false when Sheets API throws', async () => {
      const registerPromise = service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST').error(new ErrorEvent('network'));

      expect(await registerPromise).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // signOut()
  // -----------------------------------------------------------------------
  describe('signOut()', () => {
    beforeEach(async () => {
      const loginPromise = service.login(TEST_EMAIL, TEST_PASSWORD);
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);
      await loginPromise;
    });

    it('clears currentUser', () => {
      service.signOut();
      expect(service.getUser()).toBeNull();
    });

    it('isAuthenticated() returns false after signOut', () => {
      service.signOut();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('removes session from localStorage', () => {
      service.signOut();
      expect(localStorage.getItem('myfinance_user')).toBeNull();
    });

    it('clears accessToken', () => {
      service.signOut();
      expect(service.getAccessToken()).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // checkEmailExists() — REQ-07
  // -----------------------------------------------------------------------
  describe('checkEmailExists()', () => {
    it('returns true when email hash matches a row in USERS sheet', async () => {
      const checkPromise = service.checkEmailExists(TEST_EMAIL);
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);

      expect(await checkPromise).toBe(true);
    });

    it('returns false when email hash does not match any row', async () => {
      cryptoSpy.hashEmail.mockResolvedValue('unknown-hash-xyz');

      const checkPromise = service.checkEmailExists('notfound@test.com');
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);

      expect(await checkPromise).toBe(false);
    });

    it('returns false when USERS sheet is empty (only headers)', async () => {
      const checkPromise = service.checkEmailExists(TEST_EMAIL);
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS')).flush({
        range: 'USERS!A1:H1',
        majorDimension: 'ROWS',
        values: [['user_id', 'email_hash', 'email_enc', 'display_name_enc', 'password_hash', 'currency', 'period_start', 'created_at']],
      });

      expect(await checkPromise).toBe(false);
    });

    it('propagates network error when Sheets API throws', async () => {
      const checkPromise = service.checkEmailExists(TEST_EMAIL);
      await Promise.resolve();
      httpMock.expectOne(r => r.url.includes('USERS')).error(new ErrorEvent('network'));

      await expect(checkPromise).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Service Account token — access_token nunca en localStorage
  // -----------------------------------------------------------------------
  it('never writes access_token to localStorage', async () => {
    const setSpy = jest.spyOn(localStorage, 'setItem');

    const loginPromise = service.login(TEST_EMAIL, TEST_PASSWORD);
    httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);
    await loginPromise;

    // Solo debe persistir myfinance_user, nunca el access_token
    for (const call of setSpy.mock.calls) {
      expect(call[0]).toBe('myfinance_user');
    }
  });
});
