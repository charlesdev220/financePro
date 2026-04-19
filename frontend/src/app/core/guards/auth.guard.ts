import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

const PUBLIC_ROUTES = ['login', 'register'];

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth    = inject(AuthService);
  const router  = inject(Router);
  const isPublic = PUBLIC_ROUTES.includes(route.routeConfig?.path ?? '');

  if (isPublic && auth.isAuthenticated())  return router.createUrlTree(['/tabs']);
  if (!isPublic && !auth.isAuthenticated()) return router.createUrlTree(['/login']);
  return true;
};
