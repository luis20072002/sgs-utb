import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserRole } from '../../models/edu.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  login(data: { email: string; password: string }): Observable<any> {
    const body = new HttpParams()
      .set('username', data.email)
      .set('password', data.password)
      .set('grant_type', 'password');

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

    return this.http.post<any>(`${this.apiUrl}/auth/login`, body.toString(), { headers, withCredentials: true }).pipe(
      tap((res: any) => {
        if (res?.access_token) {
          localStorage.setItem('token', res.access_token);
          // Decode role from JWT payload
          const role = this.decodeRole(res.access_token);
          if (role) localStorage.setItem('user_role', role);
          if (res.user) localStorage.setItem('user_data', JSON.stringify(res.user));
        }
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

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private decodeRole(token: string): UserRole | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || payload.tipo || payload.user_role || null;
    } catch {
      return null;
    }
  }
}
