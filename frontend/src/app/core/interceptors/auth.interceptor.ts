import { inject, Injector } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  
  // No interceptamos peticiones de autenticación para evitar bucles
  if (req.url.includes('google.com/token')) {
    return next(req);
  }

  const authService = injector.get(AuthService);
  const token = authService.getAccessToken();

  if (!token) {
    return next(req);
  }

  // Attach Google OAuth2 Bearer token to every outbound request
  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq);
};
