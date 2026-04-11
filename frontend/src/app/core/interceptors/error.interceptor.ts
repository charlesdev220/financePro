import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Session expired — auth flow will handle redirect via authGuard
        console.warn('[ErrorInterceptor] 401 Unauthorized:', req.url);
      }

      if (error.status === 429) {
        // Google Sheets API quota exceeded
        console.warn('[ErrorInterceptor] 429 Quota exceeded:', req.url);
      }

      return throwError(() => error);
    })
  );
