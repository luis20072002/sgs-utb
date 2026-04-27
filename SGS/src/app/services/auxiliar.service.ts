// src/app/services/auxiliar.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/* ═══════════════════════════════════════════════════════════════════════
   MODELOS — alineados con los schemas de FastAPI
   ═══════════════════════════════════════════════════════════════════════ */

export interface Turno {
  id_turno:     number;
  nombre_turno: string;       // "Turno 1", "Turno 2", etc.
  hora_inicio:  string;       // "08:00:00"
  hora_fin:     string;       // "12:00:00"
}

export interface Planilla {
  id_planillas:      number;
  id_usuario:        number;
  id_turno:          number;
  id_edificio:       number;
  piso_1:            number;
  piso_2:            number | null;
  piso_3:            number | null;
  periodo_vigencia:  string;   // "202502"
  estado:            'activa' | 'inactiva';
  fecha_asignacion:  string;
}

export interface Aula {
  id_aula:     number;
  codigo:      string;
  nombre_aula: string;
  piso:        number;
  capacidad:   number;
  id_edificio: number;
}

export interface Novedad {
  id_novedad:     number;
  id_registro:    number;
  descripcion:    string;
  fecha_novedad:  string;     // ISO datetime
}

export interface Solicitud {
  id_solicitud:           number;
  id_registro:            number;
  descripcion:            string;
  estado:                 'pendiente' | 'en_proceso' | 'resuelta';
  fecha_solicitud:        string;
  fecha_resolucion?:      string | null;
  nota_resolucion?:       string | null;
  resuelta_por_auxiliar?: boolean;
}

export interface HorarioAuxiliar {
  id_horario:        number;
  id_usuario:        number;
  dia_semana:        number;       // 1-7 (lunes-domingo)
  id_turno_1:        number;
  id_turno_2:        number | null;
  periodo_vigencia:  string;
}

export interface HorarioExcepcion {
  id_excepcion:    number;
  id_usuario:      number;
  fecha:           string;
  tipo:            'cambio_turno' | 'ausencia_justificada';
  id_turno_nuevo?: number | null;
  motivo?:         string | null;
}

/* Filtros */
export interface FiltroFechas {
  fecha_inicio?: string; // YYYY-MM-DD
  fecha_fin?:    string;
}

export interface FiltroSolicitudes extends FiltroFechas {
  estado?: 'pendiente' | 'en_proceso' | 'resuelta';
}

/* ═══════════════════════════════════════════════════════════════════════
   SERVICE
   ═══════════════════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class AuxiliarService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Planilla ──────────────────────────────────────────────
  /** Devuelve la planilla activa del usuario en el momento actual (turno coincide con la hora). */
  getPlanillaActiva(idUsuario: number): Observable<Planilla> {
    return this.http.get<Planilla>(`${this.apiUrl}/planillas/activa/${idUsuario}`);
  }

  /** Devuelve todas las planillas del usuario (historial). */
  getPlanillasUsuario(idUsuario: number): Observable<Planilla[]> {
    return this.http.get<Planilla[]>(`${this.apiUrl}/planillas/usuario/${idUsuario}`);
  }

  // ── Turno ─────────────────────────────────────────────────
  getTurno(idTurno: number): Observable<Turno> {
    return this.http.get<Turno>(`${this.apiUrl}/turnos/${idTurno}`);
  }

  getTurnos(): Observable<Turno[]> {
    return this.http.get<Turno[]>(`${this.apiUrl}/turnos/`);
  }

  // ── Aulas ─────────────────────────────────────────────────
  /** Aulas de un edificio, opcionalmente filtradas por piso. */
  getAulasEdificio(idEdificio: number, piso?: number): Observable<Aula[]> {
    let params = new HttpParams();
    if (piso !== undefined) params = params.set('piso', piso);
    return this.http.get<Aula[]>(
      `${this.apiUrl}/aulas/edificio/${idEdificio}`,
      { params }
    );
  }

  // ── Novedades del auxiliar ────────────────────────────────
  getMisNovedades(filtro?: FiltroFechas): Observable<Novedad[]> {
    const params = this.toParams(filtro);
    return this.http.get<Novedad[]>(
      `${this.apiUrl}/novedades/mis-novedades`,
      { params }
    );
  }

  // ── Solicitudes del auxiliar ──────────────────────────────
  getMisSolicitudes(filtro?: FiltroSolicitudes): Observable<Solicitud[]> {
    const params = this.toParams(filtro);
    return this.http.get<Solicitud[]>(
      `${this.apiUrl}/solicitudes/mis-solicitudes`,
      { params }
    );
  }

  /** Marca una solicitud como resuelta (requiere nota). */
  resolverSolicitud(idSolicitud: number, nota: string): Observable<Solicitud> {
    return this.http.patch<Solicitud>(
      `${this.apiUrl}/solicitudes/${idSolicitud}/estado`,
      { estado: 'resuelta', nota_resolucion: nota }
    );
  }

  // ── Horario ───────────────────────────────────────────────
  getMiHorario(idUsuario: number): Observable<HorarioAuxiliar[]> {
    return this.http.get<HorarioAuxiliar[]>(`${this.apiUrl}/horarios/usuario/${idUsuario}`);
  }

  getMisExcepciones(idUsuario: number): Observable<HorarioExcepcion[]> {
    return this.http.get<HorarioExcepcion[]>(
      `${this.apiUrl}/horarios/excepciones/usuario/${idUsuario}`
    );
  }

  // ── Helpers ───────────────────────────────────────────────
  private toParams(obj?: Record<string, any>): HttpParams {
    let params = new HttpParams();
    if (!obj) return params;
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return params;
  }
}