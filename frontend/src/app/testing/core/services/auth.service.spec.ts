import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let capturedCallback: (response: any) => void;

  const mockTokenClient = {
    requestAccessToken: jasmine.createSpy('requestAccessToken'),
  };

  beforeEach(() => {
    // Necesario para que initTokenClient() no haga early return
    (environment as any).googleClientId = 'test-client-id';

    (window as any).google = {
      accounts: {
        oauth2: {
          initTokenClient: jasmine.createSpy('initTokenClient').and.callFake((config: any) => {
            capturedCallback = config.callback;
            return mockTokenClient;
          }),
          revoke: jasmine.createSpy('revoke').and.callFake((_token: string, cb: () => void) => cb()),
        },
      },
    };

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    delete (window as any).google;
    (environment as any).googleClientId = '';
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // REQ-03: estado inicial
  describe('initial state', () => {
    it('isAuthenticated() returns false before login', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('getAccessToken() returns null before login', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it('getUser() returns null before login', () => {
      expect(service.getUser()).toBeNull();
    });
  });

  // REQ-03: login exitoso simulado via handleTokenResponse
  describe('after successful token response', () => {
    const mockToken = 'mock-access-token-abc123';
    const mockUserInfo = { sub: 'sub-xyz', email: 'user@gmail.com', name: 'Test User' };

    beforeEach(async () => {
      const responsePromise = capturedCallback({ access_token: mockToken });
      const req = httpMock.expectOne('https://www.googleapis.com/oauth2/v3/userinfo');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush(mockUserInfo);
      await responsePromise;
    });

    it('isAuthenticated() returns true', () => {
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('getAccessToken() returns the token', () => {
      expect(service.getAccessToken()).toBe(mockToken);
    });

    it('getUser() returns sub, email and name', () => {
      const user = service.getUser();
      expect(user?.sub).toBe('sub-xyz');
      expect(user?.email).toBe('user@gmail.com');
      expect(user?.name).toBe('Test User');
    });

    // REQ-04: signOut
    describe('signOut()', () => {
      it('clears accessToken', () => {
        service.signOut();
        expect(service.getAccessToken()).toBeNull();
      });

      it('clears currentUser', () => {
        service.signOut();
        expect(service.getUser()).toBeNull();
      });

      it('isAuthenticated() returns false after signOut', () => {
        service.signOut();
        expect(service.isAuthenticated()).toBeFalse();
      });
    });
  });

  // REQ-05: token nunca en localStorage
  it('never writes token to localStorage', async () => {
    const setSpy = spyOn(localStorage, 'setItem');

    const responsePromise = capturedCallback({ access_token: 'any-token' });
    const req = httpMock.expectOne('https://www.googleapis.com/oauth2/v3/userinfo');
    req.flush({ sub: 'sub-1', email: 'a@b.com', name: 'A' });
    await responsePromise;

    expect(setSpy).not.toHaveBeenCalled();
  });

  // REQ-03: callback con error no rompe el servicio
  it('handles OAuth2 error response without throwing', async () => {
    await expectAsync(capturedCallback({ error: 'access_denied' })).toBeResolved();
    expect(service.isAuthenticated()).toBeFalse();
  });
});
