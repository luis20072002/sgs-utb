// src/app/services/planillas.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Planilla,
  PlanillaCreate,
  PlanillaUpdate,
  HorarioClase,
  HorarioClaseCreate,
  HorarioClaseUpdate,
} from '../../models/planilla.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PlanillasService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/planillas`;

  // ── Planillas ──────────────────────────────────────────────

  getPlanillas(): Observable<Planilla[]> {
    return this.http.get<Planilla[]>(`${this.base}/planillas/`);
  }

  getPlanilla(id: number): Observable<Planilla> {
    return this.http.get<Planilla>(`${this.base}/planillas/${id}`);
  }

  getPlanillasPorUsuario(idUsuario: number): Observable<Planilla[]> {
    return this.http.get<Planilla[]>(`${this.base}/planillas/usuario/${idUsuario}`);
  }

  crearPlanilla(datos: PlanillaCreate): Observable<Planilla> {
    return this.http.post<Planilla>(`${this.base}/planillas/`, datos);
  }

  actualizarPlanilla(id: number, datos: PlanillaUpdate): Observable<Planilla> {
    return this.http.put<Planilla>(`${this.base}/planillas/${id}`, datos);
  }

  cambiarEstado(id: number, estado: 'activa' | 'inactiva'): Observable<Planilla> {
    return this.http.patch<Planilla>(`${this.base}/planillas/${id}/estado`, { estado });
  }

  eliminarPlanilla(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/planillas/${id}`);
  }

  // ── Horarios de Clase ──────────────────────────────────────

  getClasesPorPlanilla(idPlanilla: number): Observable<HorarioClase[]> {
    return this.http.get<HorarioClase[]>(`${this.base}/horarios-clase/planilla/${idPlanilla}`);
  }

  crearClase(datos: HorarioClaseCreate): Observable<HorarioClase> {
    return this.http.post<HorarioClase>(`${this.base}/horarios-clase/`, datos);
  }

  actualizarClase(id: number, datos: HorarioClaseUpdate): Observable<HorarioClase> {
    return this.http.put<HorarioClase>(`${this.base}/horarios-clase/${id}`, datos);
  }

  eliminarClase(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/horarios-clase/${id}`);
  }
}