// src/app/services/docentes.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Tipos ─────────────────────────────────────────────────────────
export interface Docente {
  id_docente: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  estado: boolean;
}

export interface DocenteCreatePayload {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
}

@Injectable({ providedIn: 'root' })
export class DocentesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/docentes`;

  /**
   * Lista todos los docentes.
   * Opcionalmente filtra solo activos vía query param `?activos=true`.
   */
  list(activosOnly?: boolean): Observable<Docente[]> {
    let params = new HttpParams();
    if (activosOnly) params = params.set('activos', 'true');
    return this.http.get<Docente[]>(`${this.base}/`, { params });
  }

  get(id: number): Observable<Docente> {
    return this.http.get<Docente>(`${this.base}/${id}`);
  }

  create(payload: DocenteCreatePayload): Observable<Docente> {
    return this.http.post<Docente>(`${this.base}/`, payload);
  }

  /**
   * Actualiza un docente. El backend espera el payload completo (DocenteCreate),
   * no solo los cambios.
   */
  update(id: number, payload: DocenteCreatePayload): Observable<Docente> {
    return this.http.put<Docente>(`${this.base}/${id}`, payload);
  }

  /**
   * Desactivación lógica (soft delete). El backend pone estado=False.
   */
  desactivar(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.base}/${id}`);
  }

  /**
   * Reactivar un docente previamente desactivado.
   */
  activar(id: number): Observable<Docente> {
    return this.http.patch<Docente>(`${this.base}/${id}/activar`, {});
  }
}
