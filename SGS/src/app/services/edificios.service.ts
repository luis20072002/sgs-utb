// src/app/services/edificios.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from, concatMap, toArray, of, catchError, map } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Tipos ─────────────────────────────────────────────────────────
export interface Edificio {
  id_edificio: number;
  nombre: string;
  codigo: string;
  cantidad_pisos: number;
  estado: boolean;
}

export interface EdificioCreatePayload {
  nombre: string;
  codigo: string;
  cantidad_pisos: number;
}

export interface EdificioUpdatePayload {
  nombre?: string;
  codigo?: string;
  cantidad_pisos?: number;
  estado?: boolean;
}

export interface Aula {
  id_aula: number;
  codigo: string;
  nombre_aula: string | null;
  piso: number;
  capacidad: number;
  id_edificio: number;
}

export interface AulaCreatePayload {
  codigo: string;
  nombre_aula?: string | null;
  piso: number;
  capacidad: number;
  id_edificio: number;
}

export interface BulkAulaResult {
  payload: AulaCreatePayload;
  success: boolean;
  error?: string;
  created?: Aula;
}

@Injectable({ providedIn: 'root' })
export class EdificiosService {
  private http = inject(HttpClient);
  private baseEdificios = `${environment.apiUrl}/edificios`;
  private baseAulas     = `${environment.apiUrl}/aulas`;

  // ─────────────────────────────────────────────────────────────────
  // Edificios
  // ─────────────────────────────────────────────────────────────────
  listEdificios(): Observable<Edificio[]> {
    return this.http.get<Edificio[]>(`${this.baseEdificios}/`);
  }

  createEdificio(payload: EdificioCreatePayload): Observable<Edificio> {
    return this.http.post<Edificio>(`${this.baseEdificios}/`, payload);
  }

  updateEdificio(id: number, payload: EdificioUpdatePayload): Observable<Edificio> {
    return this.http.put<Edificio>(`${this.baseEdificios}/${id}`, payload);
  }

  removeEdificio(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.baseEdificios}/${id}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Aulas
  // ─────────────────────────────────────────────────────────────────
  listAulas(): Observable<Aula[]> {
    return this.http.get<Aula[]>(`${this.baseAulas}/`);
  }

  listAulasPorEdificio(idEdificio: number, piso?: number): Observable<Aula[]> {
    let params = new HttpParams();
    if (piso !== undefined) params = params.set('piso', String(piso));
    return this.http.get<Aula[]>(`${this.baseAulas}/edificio/${idEdificio}`, { params });
  }

  createAula(payload: AulaCreatePayload): Observable<Aula> {
    return this.http.post<Aula>(`${this.baseAulas}/`, payload);
  }

  updateAula(id: number, payload: AulaCreatePayload): Observable<Aula> {
    return this.http.put<Aula>(`${this.baseAulas}/${id}`, payload);
  }

  removeAula(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.baseAulas}/${id}`);
  }

  /**
   * Carga masiva de aulas.
   *
   * El backend NO tiene endpoint /aulas/bulk, así que enviamos las aulas
   * de a una usando concatMap (secuencial) y recolectamos los resultados.
   * Reportamos por cada fila si fue success o error con el mensaje.
   *
   * TODO: cuando exista POST /aulas/bulk, reemplazar por una sola llamada.
   */
  createAulasBulk(payloads: AulaCreatePayload[]): Observable<BulkAulaResult[]> {
    return from(payloads).pipe(
      concatMap(payload =>
        this.createAula(payload).pipe(
          map(created => ({ payload, success: true, created } as BulkAulaResult)),
          catchError(err => {
            const detail = err?.error?.detail || err?.message || 'Error desconocido';
            return of({ payload, success: false, error: detail } as BulkAulaResult);
          })
        )
      ),
      toArray()
    );
  }
}
