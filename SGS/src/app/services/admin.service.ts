// src/app/services/admin.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ─── Tipos compartidos ────────────────────────────────────────────────
export interface AdminKpiStats {
  auxiliaresActivos: number;
  docentesRegistrados: number;
  planillasGeneradas: number;
  reportesPeriodo: number;
}

export interface AlertaSistema {
  id: string;
  tipo: 'planilla_incompleta' | 'solicitud_pendiente' | 'auxiliar_sin_horario' | 'edificio_sin_planilla' | 'novedad_critica';
  titulo: string;
  descripcion: string;
  fecha: string;            // ISO
  severidad: 'alta' | 'media' | 'baja';
  ruta?: string;            // hacia dónde redirigir al hacer click
}

/**
 * Servicio centralizado del Panel Admin.
 *
 * Agrupa las llamadas que necesitan varias subpantallas a la vez:
 *  - KPIs del dashboard
 *  - Alertas del sistema
 *  - Conteos rápidos para badges del sidebar (futuro)
 *
 * Los CRUDs específicos (auxiliares, edificios, etc.) viven en sus
 * propios services para mantener este archivo enfocado.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ────────────────────────────────────────────────────────────────
  // KPIs del Dashboard
  // ────────────────────────────────────────────────────────────────

  /**
   * Carga los 4 KPIs del dashboard en paralelo.
   * Cada uno cae a 0 si su endpoint falla (resiliente).
   */
  getKpiStats(): Observable<AdminKpiStats> {
    return forkJoin({
      auxiliares: this.http.get<any[]>(`${this.base}/usuarios/auxiliares`).pipe(
        catchError(() => of([]))
      ),
      docentes: this.http.get<any[]>(`${this.base}/docentes/`).pipe(
        catchError(() => of([]))
      ),
      planillas: this.http.get<any[]>(`${this.base}/planillas/`).pipe(
        catchError(() => of([]))
      ),
      registros: this.http.get<any[]>(`${this.base}/registros/`).pipe(
        catchError(() => of([]))
      ),
    }).pipe(
      map(({ auxiliares, docentes, planillas, registros }) => ({
        auxiliaresActivos:    auxiliares.filter((a: any) => a.estado).length,
        docentesRegistrados:  docentes.filter((d: any) => d.estado).length,
        planillasGeneradas:   planillas.length,
        reportesPeriodo:      registros.length,
      }))
    );
  }

  // ────────────────────────────────────────────────────────────────
  // Alertas del sistema
  // ────────────────────────────────────────────────────────────────

  /**
   * Trae alertas accionables para el dashboard.
   *
   * Mientras el backend no exponga un endpoint dedicado /alertas,
   * componemos las alertas con datos derivados de:
   *   - solicitudes pendientes (rojo si llevan >3 días)
   *   - planillas activas sin registros del día (amarillo)
   *   - auxiliares activos sin horario asignado (amarillo)
   *
   * Cuando exista GET /admin/alertas en el backend, basta cambiar
   * esta implementación por una sola llamada HTTP.
   */
  getAlertasSistema(): Observable<AlertaSistema[]> {
    return forkJoin({
      solicitudes: this.http.get<any[]>(`${this.base}/solicitudes/`).pipe(
        catchError(() => of([]))
      ),
      planillas:   this.http.get<any[]>(`${this.base}/planillas/`).pipe(
        catchError(() => of([]))
      ),
    }).pipe(
      map(({ solicitudes, planillas }) => {
        const alertas: AlertaSistema[] = [];

        // Solicitudes pendientes
        const pendientes = solicitudes.filter((s: any) => s.estado === 'pendiente');
        if (pendientes.length > 0) {
          alertas.push({
            id: 'sol-pendientes',
            tipo: 'solicitud_pendiente',
            titulo: `${pendientes.length} solicitud${pendientes.length > 1 ? 'es' : ''} pendiente${pendientes.length > 1 ? 's' : ''}`,
            descripcion: 'Hay solicitudes que esperan revisión del administrador.',
            fecha: new Date().toISOString(),
            severidad: pendientes.length > 5 ? 'alta' : 'media',
            ruta: '/admin/solicitudes',
          });
        }

        // Planillas inactivas que aún tienen pisos asignados
        const inactivas = planillas.filter((p: any) => p.estado === 'inactiva');
        if (inactivas.length > 0) {
          alertas.push({
            id: 'planillas-inactivas',
            tipo: 'planilla_incompleta',
            titulo: `${inactivas.length} planilla${inactivas.length > 1 ? 's' : ''} inactiva${inactivas.length > 1 ? 's' : ''}`,
            descripcion: 'Revisa si requieren reasignación al inicio del semestre.',
            fecha: new Date().toISOString(),
            severidad: 'baja',
            ruta: '/admin/planillas',
          });
        }

        // Sin alertas → mostrar estado limpio
        if (alertas.length === 0) {
          alertas.push({
            id: 'all-clear',
            tipo: 'planilla_incompleta',
            titulo: 'Todo en orden',
            descripcion: 'No hay alertas activas en este momento.',
            fecha: new Date().toISOString(),
            severidad: 'baja',
          });
        }

        return alertas;
      })
    );
  }
}
