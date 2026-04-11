import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isAuthenticated()', () => {
    it('returns false when no token has been set', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('returns true after setAccessToken() is called', () => {
      service.setAccessToken('test-token-123');
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('returns false after clearSession() is called', () => {
      service.setAccessToken('test-token-123');
      service.clearSession();
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('getAccessToken()', () => {
    it('returns null when no token has been set', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it('returns the token after setAccessToken()', () => {
      service.setAccessToken('google-oauth2-token');
      expect(service.getAccessToken()).toBe('google-oauth2-token');
    });

    it('returns null after clearSession()', () => {
      service.setAccessToken('google-oauth2-token');
      service.clearSession();
      expect(service.getAccessToken()).toBeNull();
    });
  });

  it('never writes token to localStorage', () => {
    const setSpy = spyOn(localStorage, 'setItem');
    service.setAccessToken('any-token');
    expect(setSpy).not.toHaveBeenCalled();
  });
});
