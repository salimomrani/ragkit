import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

export function authInterceptor(
  req: HttpRequest<unknown>,
  nextHandler$: HttpHandlerFn,
): ReturnType<HttpInterceptorFn> {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.token();

  const nextReq = token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      })
    : req;

  return nextHandler$(nextReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        authService.logout();
        void router.navigate(['/login']);
      }

      return throwError(() => err);
    }),
  );
}
