import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { UserRole } from '../../models/edu.models';

export interface UserProfile {
  id_usuario: number;
  nombre: string;
  correo?: string;
  rol: { rol_id: number; nombre_rol: string };
  estado: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  login(data: { email: string; password: string }): Observable<UserProfile> {
    const body = new HttpParams()
      .set('username', data.email)
      .set('password', data.password)
      .set('grant_type', 'password');

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

    return this.http
      .post<any>(`${this.apiUrl}/auth/login`, body.toString(), { headers })
      .pipe(
        tap((res: any) => {
          if (res?.access_token) {
            localStorage.setItem('token', res.access_token);
            const role = this.decodeRole(res.access_token);
            if (role) localStorage.setItem('user_role', role);
          }
        }),
        switchMap(() => this.http.get<UserProfile>(`${this.apiUrl}/usuarios/me`)),
        tap((user: UserProfile) => {
          localStorage.setItem('user_data', JSON.stringify(user));
        })
      );
  }

  changePassword(data: { current_password: string; new_password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/change-password`, data);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_data');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRole(): UserRole | null {
    return (localStorage.getItem('user_role') as UserRole) || null;
  }

  getUserData(): UserProfile | null {
    try {
      const data = localStorage.getItem('user_data');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private decodeRole(token: string): UserRole | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // El backend manda "rol" como número: 1 = administrador, 2 = auxiliar
      const rolId = payload.rol;
      if (rolId === 1) return 'administrador';
      if (rolId === 2) return 'auxiliar';
      return null;
    } catch {
      return null;
    }
  }
}
