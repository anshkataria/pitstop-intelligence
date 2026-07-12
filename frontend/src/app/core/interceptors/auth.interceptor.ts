import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_URL } from '../tokens/api.tokens';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const apiUrl = inject(API_URL);
  const isBackendRequest = request.url.startsWith(apiUrl);
  const isAuthRequest = request.url.includes('/v1/auth/');
  const token = auth.accessToken();
  const authenticatedRequest = isBackendRequest && token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(authenticatedRequest).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status !== 401 || !isBackendRequest || isAuthRequest || !auth.session()) {
      return throwError(() => error);
    }
    return auth.refresh().pipe(
      switchMap((session) => next(request.clone({
        setHeaders: { Authorization: `Bearer ${session.accessToken}` },
      }))),
      catchError((refreshError) => {
        auth.clearSession();
        return throwError(() => refreshError);
      }),
    );
  }));
};
