import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8000/auth/login'; // endpoint OAuth2 estándar

  constructor(private http: HttpClient) {}

  login(data: { email: string; password: string }) {
    const body = new HttpParams()
      .set('username', data.email)   // OAuth2 usa "username", no "email"
      .set('password', data.password)
      .set('grant_type', 'password'); // requerido en OAuth2

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<any>(this.apiUrl, body.toString(), { headers,withCredentials: true  });
  }
}