import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (_route, _state) => {
  // Phase 1 stub: allow all navigation while Google OAuth2 is not configured.
  // Replace this return with real auth check in task 1.2.x:
  //   const authService = inject(AuthService);
  //   const router = inject(Router);
  //   return authService.isAuthenticated() || router.createUrlTree(['/login']);
  return true;
};
