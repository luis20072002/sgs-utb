// src/app/services/horarios.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Modelos ──────────────────────────────────────────────────────────────────

export interface HorarioAuxiliar {
  id_horario: number;
  id_usuario: number;
  dia_semana: number;         // 1=Lun … 7=Dom
  id_turno_1: number;
  id_turno_2: number | null;
  periodo_vigencia: string;   // 'YYYYSS' e.g. '202501'
}

export interface HorarioAuxiliarCreate {
  id_usuario: number;
  dia_semana: number;
  id_turno_1: number;
  id_turno_2?: number | null;
  periodo_vigencia: string;
}

export interface HorarioAuxiliarUpdate {
  dia_semana?: number;
  id_turno_1?: number;
  id_turno_2?: number | null;
  periodo_vigencia?: string;
}

export interface HorarioExcepcion {
  id_excepcion: number;
  id_usuario: number;
  fecha: string;              // 'YYYY-MM-DD'
  tipo: 'cambio_turno' | 'ausencia_justificada';
  id_turno_nuevo: number | null;
  motivo: string | null;
  id_admin: number;
}

export interface HorarioExcepcionCreate {
  id_usuario: number;
  fecha: string;
  tipo: 'cambio_turno' | 'ausencia_justificada';
  id_turno_nuevo?: number | null;
  motivo?: string | null;
}

export interface Turno {
  id_turno: number;
  nombre_turno: string;
  hora_inicio: string;        // 'HH:mm:ss'
  hora_fin: string;
}

export interface UsuarioAuxiliar {
  id_usuario: number;
  nombre: string;
  correo: string;
  estado: boolean;
  id_edificio: number | null;
  rol: { rol_id: number; nombre_rol: string };
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class HorariosService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Horarios ──────────────────────────────────────────────────────────────

  /** Lista todos los horarios (admin only) */
  getHorarios(): Observable<HorarioAuxiliar[]> {
    return this.http.get<HorarioAuxiliar[]>(`${this.base}/horarios/`);
  }

  /** Horarios de un auxiliar específico */
  getHorariosPorUsuario(idUsuario: number): Observable<HorarioAuxiliar[]> {
    return this.http.get<HorarioAuxiliar[]>(`${this.base}/horarios/usuario/${idUsuario}`);
  }

  /** Crear nuevo horario para un auxiliar */
  crearHorario(datos: HorarioAuxiliarCreate): Observable<HorarioAuxiliar> {
    return this.http.post<HorarioAuxiliar>(`${this.base}/horarios/`, datos);
  }

  /** Actualizar horario existente */
  actualizarHorario(id: number, datos: HorarioAuxiliarUpdate): Observable<HorarioAuxiliar> {
    return this.http.put<HorarioAuxiliar>(`${this.base}/horarios/${id}`, datos);
  }

  /** Eliminar horario */
  eliminarHorario(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/horarios/${id}`);
  }

  // ── Excepciones ───────────────────────────────────────────────────────────

  /** Excepciones puntuales de un auxiliar */
  getExcepcionesPorUsuario(idUsuario: number): Observable<HorarioExcepcion[]> {
    return this.http.get<HorarioExcepcion[]>(`${this.base}/horarios/excepciones/usuario/${idUsuario}`);
  }

  /** Registrar excepción puntual */
  crearExcepcion(datos: HorarioExcepcionCreate): Observable<HorarioExcepcion> {
    return this.http.post<HorarioExcepcion>(`${this.base}/horarios/excepciones/`, datos);
  }

  /** Eliminar excepción */
  eliminarExcepcion(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/horarios/excepciones/${id}`);
  }

  // ── Datos de apoyo ────────────────────────────────────────────────────────

  /** Lista todos los usuarios — filtramos auxiliares en el componente */
  getUsuarios(): Observable<UsuarioAuxiliar[]> {
    return this.http.get<UsuarioAuxiliar[]>(`${this.base}/usuarios/`);
  }

  /** Lista de turnos disponibles */
  getTurnos(): Observable<Turno[]> {
    return this.http.get<Turno[]>(`${this.base}/turnos/`);
  }
}