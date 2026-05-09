// src/app/services/registros.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Modelos ──────────────────────────────────────────────────────────────────

export interface Registro {
  id_registro:              number;
  id_turno:                 number;
  id_aula:                  number;
  id_docente:               number;
  id_curso:                 number;
  id_usuario:               number;
  asistencia_docente:       boolean;
  uso_medios_audiovisuales: boolean;
  fecha_registro:           string;   // 'YYYY-MM-DD'
  hora_registro:            string;   // 'HH:mm:ss'
}

export interface RegistroCreatePayload {
  id_turno:                 number;
  id_aula:                  number;
  id_docente:               number;
  id_curso:                 number;
  asistencia_docente:       boolean;
  uso_medios_audiovisuales: boolean;
  fecha_registro:           string;   // 'YYYY-MM-DD'
  hora_registro:            string;   // 'HH:mm:ss'
}

export interface RegistroUpdatePayload {
  id_turno:                 number;
  id_aula:                  number;
  id_docente:               number;
  id_curso:                 number;
  asistencia_docente:       boolean;
  uso_medios_audiovisuales: boolean;
  fecha_registro:           string;
  hora_registro:            string;
}

export interface NovedadCreatePayload {
  id_registro: number;
  descripcion: string;
}

export interface SolicitudCreatePayload {
  id_registro: number;
  descripcion: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class RegistrosService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Registros ────────────────────────────────────────────────────────────

  /** Crea un nuevo registro de aula */
  crear(payload: RegistroCreatePayload): Observable<Registro> {
    return this.http.post<Registro>(`${this.base}/registros/`, payload);
  }

  /** Actualiza un registro existente (dentro del lapso del turno) */
  actualizar(id: number, payload: RegistroUpdatePayload): Observable<Registro> {
    return this.http.put<Registro>(`${this.base}/registros/${id}`, payload);
  }

  /** Obtiene registros del auxiliar autenticado */
  getMisRegistros(): Observable<Registro[]> {
    return this.http.get<Registro[]>(`${this.base}/registros/mis-registros`);
  }

  /** Obtiene el registro de una aula específica en una planilla */
  getRegistroPorAula(idPlanilla: number, idAula: number): Observable<Registro | null> {
    return this.http.get<Registro>(
      `${this.base}/registros/planilla/${idPlanilla}/aula/${idAula}`
    );
  }

  // ── Novedades ─────────────────────────────────────────────────────────────

  /** Crea una novedad asociada a un registro */
  crearNovedad(payload: NovedadCreatePayload): Observable<any> {
    return this.http.post(`${this.base}/novedades/`, payload);
  }

  // ── Solicitudes ───────────────────────────────────────────────────────────

  /** Crea una solicitud asociada a un registro */
  crearSolicitud(payload: SolicitudCreatePayload): Observable<any> {
    return this.http.post(`${this.base}/solicitudes/`, payload);
  }
}