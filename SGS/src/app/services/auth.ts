// src/app/services/auth.ts
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserRole } from '../../models/edu.models';
import { environment } from './../../environments/environment';

/**
 * Forma del usuario que devuelve GET /usuarios/me en el backend.
 * Coincide con UsuarioResponse del schema de FastAPI.
 */
export interface UserProfile {
  id_usuario: number;
  nombre: string;
  correo?: string;
  rol: { rol_id: number; nombre_rol: string };
  estado: boolean;
}

/**
 * Forma de la respuesta de /auth/login (FastAPI)
 */
interface LoginResponse {
  access_token: string;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  // Claves de storage centralizadas en un solo lugar
  private readonly TOKEN_KEY = 'token';
  private readonly ROLE_KEY = 'user_role';
  private readonly USER_KEY = 'user_data';

  constructor(private http: HttpClient, private router: Router) {}

  /**
   * Inicia sesión contra POST /auth/login.
   * El backend espera form-data (OAuth2PasswordRequestForm), por eso
   * mandamos x-www-form-urlencoded con `username` y `password`.
   *
   * Tras un login exitoso, guarda el token, decodifica el rol y trae el perfil
   * con GET /usuarios/me. Si /me falla (p.ej. el endpoint aún no existe en el
   * backend), igualmente conservamos el token y el rol decodificado del JWT.
   */
  login(data: { email: string; password: string }): Observable<UserProfile | null> {
    const body = new HttpParams()
      .set('username', data.email)
      .set('password', data.password)
      .set('grant_type', 'password');

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, body.toString(), { headers })
      .pipe(
        tap((res) => {
          if (res?.access_token) {
            localStorage.setItem(this.TOKEN_KEY, res.access_token);
            const role = this.decodeRole(res.access_token);
            if (role) localStorage.setItem(this.ROLE_KEY, role);
          }
        }),
        switchMap(() =>
          this.http.get<UserProfile>(`${this.apiUrl}/usuarios/me`).pipe(
            tap((user) => {
              localStorage.setItem(this.USER_KEY, JSON.stringify(user));
            }),
            // Si /me falla pero el login fue OK, no rompemos el flujo:
            // el rol ya quedó guardado del JWT.
            catchError(() => of(null))
          )
        )
      );
  }

  /**
   * Cambio de contraseña. POST /auth/change-password (requiere JWT).
   * El interceptor inyecta el Authorization header automáticamente.
   */
  changePassword(data: { current_password: string; new_password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/change-password`, data);
  }

  /**
   * Cierra sesión: limpia el storage.
   * Nota: el JWT actual del backend es stateless (no hay /logout que invalide
   * el token server-side). Si se requiere invalidación real, habría que
   * implementar una blacklist en el backend.
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Cierra sesión y redirige al login.
   * Útil para llamarlo desde el interceptor cuando el token expira.
   */
  logoutAndRedirect(): void {
    this.logout();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRole(): UserRole | null {
    return (localStorage.getItem(this.ROLE_KEY) as UserRole) || null;
  }

  getUserData(): UserProfile | null {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    // Verificamos que el token no esté expirado mirando el `exp` del payload.
    return !this.isTokenExpired(token);
  }

  /**
   * Verifica si el JWT está expirado leyendo el claim `exp` (segundos epoch).
   * Si no se puede parsear, asumimos expirado por seguridad.
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return false; // sin exp, no podemos saber, lo dejamos pasar
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true;
    }
  }

  /**
   * Decodifica el rol numérico que viene en el JWT.
   * El backend envía: { sub: id_usuario, rol: rol_id }
   *   rol_id = 1 → administrador
   *   rol_id = 2 → auxiliar
   */
  private decodeRole(token: string): UserRole | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const rolId = payload.rol;
      if (rolId === 1) return 'administrador';
      if (rolId === 2) return 'auxiliar';
      return null;
    } catch {
      return null;
    }
  }
}