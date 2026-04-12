import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from '../../../core/services/auth.service';
import { CryptoService } from '../../../core/services/crypto.service';
import { environment } from '../../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let cryptoSpy: jasmine.SpyObj<CryptoService>;

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
    (environment as any).googleServiceAccountEmail = '';
    (environment as any).googlePrivateKey = '';

    cryptoSpy = jasmine.createSpyObj('CryptoService', [
      'deriveKey',
      'encrypt',
      'decrypt',
      'hashPassword',
      'hashEmail',
      'isReady',
    ]);
    cryptoSpy.deriveKey.and.returnValue(Promise.resolve());
    cryptoSpy.encrypt.and.callFake(async (text: string) => `enc(${text})`);
    cryptoSpy.decrypt.and.callFake(async (text: string) => text.replace('enc(', '').replace(')', ''));
    cryptoSpy.hashPassword.and.returnValue(Promise.resolve(MOCK_PASSWORD_HASH));
    cryptoSpy.hashEmail.and.returnValue(Promise.resolve(MOCK_EMAIL_HASH));
    cryptoSpy.isReady.and.returnValue(false);

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
    (environment as any).googleServiceAccountEmail = '';
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
      expect(service.isAuthenticated()).toBeFalse();
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

      const req = httpMock.expectOne(r => r.url.includes('USERS'));
      expect(req.request.method).toBe('GET');
      req.flush(mockUsersResponse);

      expect(await loginPromise).toBeTrue();
      expect(service.isAuthenticated()).toBeTrue();

      const user = service.getUser();
      expect(user?.sub).toBe(MOCK_USER_ID); // sub = UUID, no el email
      expect(user?.email).toBe(TEST_EMAIL);
    });

    it('calls deriveKey with UUID and decrypt with encrypted name', async () => {
      const loginPromise = service.login(TEST_EMAIL, TEST_PASSWORD);
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);
      await loginPromise;

      // deriveKey recibe el UUID, no el email
      expect(cryptoSpy.deriveKey).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(cryptoSpy.decrypt).toHaveBeenCalledWith(MOCK_ENC_NAME);
    });

    it('persists session to localStorage', async () => {
      const loginPromise = service.login(TEST_EMAIL, TEST_PASSWORD);
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);
      await loginPromise;

      const stored = JSON.parse(localStorage.getItem('myfinance_user')!);
      expect(stored.sub).toBe(TEST_EMAIL);
    });

    it('returns false when password hash does not match', async () => {
      cryptoSpy.hashPassword.and.returnValue(Promise.resolve('totally-wrong-hash'));

      const loginPromise = service.login(TEST_EMAIL, 'badPassword');
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);

      expect(await loginPromise).toBeFalse();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('returns false when email hash does not match any row', async () => {
      cryptoSpy.hashEmail.and.returnValue(Promise.resolve('unknown-email-hash'));

      const loginPromise = service.login('notfound@test.com', TEST_PASSWORD);
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);

      expect(await loginPromise).toBeFalse();
    });

    it('returns false when sheet has only headers (no users)', async () => {
      const loginPromise = service.login(TEST_EMAIL, TEST_PASSWORD);
      httpMock.expectOne(r => r.url.includes('USERS')).flush({
        range: 'USERS!A1:G1',
        majorDimension: 'ROWS',
        values: [['user_id', 'email', 'display_name', 'password_hash', 'default_currency', 'period_start_day', 'created_at']],
      });

      expect(await loginPromise).toBeFalse();
    });

    it('returns false when sheet response is null', async () => {
      const loginPromise = service.login(TEST_EMAIL, TEST_PASSWORD);
      httpMock.expectOne(r => r.url.includes('USERS')).flush(null);

      expect(await loginPromise).toBeFalse();
    });
  });

  // -----------------------------------------------------------------------
  // register()
  // -----------------------------------------------------------------------
  describe('register()', () => {
    it('returns true and sets session on success', async () => {
      const registerPromise = service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });

      const req = httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST');
      req.flush({ updates: { updatedRange: 'USERS!A2' } });

      expect(await registerPromise).toBeTrue();
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.getUser()?.email).toBe(TEST_EMAIL);
    });

    it('writes UUID as user_id (not email), and encrypts PII', async () => {
      const registerPromise = service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });

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
      httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST').flush({});
      await registerPromise;

      expect(service.getUser()?.sub).not.toBe(TEST_EMAIL);
      expect(service.getUser()?.sub).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('calls deriveKey with the UUID before encrypting', async () => {
      const registerPromise = service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST').flush({});
      await registerPromise;

      // deriveKey debe recibir el UUID (no el email)
      const deriveArg = cryptoSpy.deriveKey.calls.first().args[0];
      expect(deriveArg).not.toBe(TEST_EMAIL);
      expect(deriveArg).toMatch(/^[0-9a-f-]{36}$/);
      // deriveKey ANTES de encrypt
      const deriveOrder = cryptoSpy.deriveKey.calls.first().invocationOrder;
      const encryptOrder = cryptoSpy.encrypt.calls.first().invocationOrder;
      expect(deriveOrder).toBeLessThan(encryptOrder);
    });

    it('returns false when Sheets API throws', async () => {
      const registerPromise = service.register({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
      httpMock.expectOne(r => r.url.includes('USERS') && r.method === 'POST').error(new ErrorEvent('network'));

      expect(await registerPromise).toBeFalse();
    });
  });

  // -----------------------------------------------------------------------
  // signOut()
  // -----------------------------------------------------------------------
  describe('signOut()', () => {
    beforeEach(async () => {
      const loginPromise = service.login(TEST_EMAIL, TEST_PASSWORD);
      httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);
      await loginPromise;
    });

    it('clears currentUser', () => {
      service.signOut();
      expect(service.getUser()).toBeNull();
    });

    it('isAuthenticated() returns false after signOut', () => {
      service.signOut();
      expect(service.isAuthenticated()).toBeFalse();
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
  // Service Account token — access_token nunca en localStorage
  // -----------------------------------------------------------------------
  it('never writes access_token to localStorage', async () => {
    const setSpy = spyOn(localStorage, 'setItem').and.callThrough();

    const loginPromise = service.login(TEST_EMAIL, TEST_PASSWORD);
    httpMock.expectOne(r => r.url.includes('USERS')).flush(mockUsersResponse);
    await loginPromise;

    // Solo debe persistir myfinance_user, nunca el access_token
    for (const call of setSpy.calls.all()) {
      expect(call.args[0]).toBe('myfinance_user');
    }
  });
});
