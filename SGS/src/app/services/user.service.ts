import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
 
export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: 'auxiliar';
}
 
export interface CreateDocentePayload {
  id_docente: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
}
 
export interface ToggleUserPayload {
  status: 'activo' | 'inactivo';
}
 
@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:8000';
 
  constructor(private http: HttpClient) {}
 
  createUser(data: CreateUserPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users`, data);
  }
 
  createDocente(data: CreateDocentePayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/docentes`, data);
  }
 
  toggleUserStatus(userId: string, payload: ToggleUserPayload): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/users/${userId}/status`, payload);
  }
}