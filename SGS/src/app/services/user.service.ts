import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateAuxiliarPayload {
  nombre: string;
  correo: string;
  pwsd: string;
  estado: boolean;
  rol_id: number;
}

export interface CreateDocentePayload {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  getUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios/`);
  }

  createAuxiliar(data: CreateAuxiliarPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/usuarios/`, data);
  }

  toggleUsuario(id: number, estado: boolean): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/usuarios/${id}`, { estado });
  }

  getDocentes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/docentes/`);
  }

  createDocente(data: CreateDocentePayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/docentes/`, data);
  }
}
