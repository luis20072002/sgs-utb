// src/app/services/turnos.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Tipos ─────────────────────────────────────────────────────────
export interface Turno {
  id_turno: number;
  nombre_turno: string;
  hora_inicio: string;   // 'HH:mm:ss'
  hora_fin: string;
}

export interface TurnoCreatePayload {
  nombre_turno: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface TurnoUpdatePayload {
  nombre_turno?: string;
  hora_inicio?: string;
  hora_fin?: string;
}

@Injectable({ providedIn: 'root' })
export class TurnosService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/turnos`;

  list(): Observable<Turno[]> {
    return this.http.get<Turno[]>(`${this.base}/`);
  }

  get(id: number): Observable<Turno> {
    return this.http.get<Turno>(`${this.base}/${id}`);
  }

  create(payload: TurnoCreatePayload): Observable<Turno> {
    return this.http.post<Turno>(`${this.base}/`, payload);
  }

  update(id: number, payload: TurnoUpdatePayload): Observable<Turno> {
    return this.http.put<Turno>(`${this.base}/${id}`, payload);
  }

  remove(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/${id}`);
  }
}
