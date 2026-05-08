// src/app/interceptors/auth-interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor que:
 *  1) Inyecta el header Authorization: Bearer <token> en cada request,
 *     excepto en el propio /auth/login (no necesita y puede confundir al backend).
 *  2) Si el backend responde 401 en una request distinta a /auth/login,
 *     significa que el token expiró o es inválido → limpiamos la sesión
 *     y redirigimos a /login.
 *
 *  Nota: el 401 que devuelve /auth/login al fallar las credenciales se deja pasar
 *  tal cual para que el componente Login lo muestre como "Credenciales incorrectas".
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const isLoginCall = req.url.includes('/auth/login');

  const token = localStorage.getItem('token');

  const authReq = (token && !isLoginCall)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isLoginCall) {
        // Token expirado o inválido → cerrar sesión y mandar al login
        localStorage.removeItem('token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_data');
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};