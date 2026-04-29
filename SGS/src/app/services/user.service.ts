// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';

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

export interface CreateCursoPayload {
  nombre_curso: string;
  codi_curso: string;
  id_docente: number;
  id_aula: number;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Usuarios ───────────────────────────────────────────────
  getUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios/`);
  }

  createAuxiliar(data: CreateAuxiliarPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/usuarios/`, data);
  }

  toggleUsuario(id: number, estado: boolean): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/usuarios/${id}`, { estado });
  }

  // ── Docentes ───────────────────────────────────────────────
  getDocentes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/docentes/`);
  }

  createDocente(data: CreateDocentePayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/docentes/`, data);
  }

  toggleDocente(id: number, activar: boolean): Observable<any> {
    if (activar) {
      return this.http.patch<any>(`${this.apiUrl}/docentes/${id}/activar`, {});
    }
    return this.http.delete<any>(`${this.apiUrl}/docentes/${id}`);
  }

  // ── Cursos ─────────────────────────────────────────────────
  getCursos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/cursos/`);
  }

  createCurso(data: CreateCursoPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cursos/`, data);
  }

  deleteCurso(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/cursos/${id}`);
  }

  // ── Aulas (para el select al crear cursos) ─────────────────
  getAulas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/aulas/`);
  }

  // ── Horarios de auxiliares ─────────────────────────────────
  getHorarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/horarios/`);
  }

  // ── Registros de aula ──────────────────────────────────────
  getRegistros(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/registros/`);
  }
}