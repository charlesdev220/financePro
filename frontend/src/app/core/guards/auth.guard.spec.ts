import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('returns true — allows navigation unconditionally in Phase 1', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, mockState)
    );
    expect(result).toBeTrue();
  });
});
