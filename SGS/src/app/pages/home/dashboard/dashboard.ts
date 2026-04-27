// src/app/pages/home/dashboard/dashboard.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../../services/auth';
import {
  AuxiliarService,
  Planilla,
  Turno,
  Aula,
  Novedad,
  Solicitud
} from '../../../services/auxiliar.service';

interface DashStats {
  totalAulas:        number;
  novedadesHoy:      number;
  solicitudesAbiertas: number;
}

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class HomeDashboardComponent implements OnInit {

  // Estado
  isLoading      = signal(true);
  hasActiveShift = signal(false);   // ¿hay planilla activa en este momento?
  loadError      = signal('');

  // Datos
  planilla   = signal<Planilla | null>(null);
  turno      = signal<Turno | null>(null);
  aulas      = signal<Aula[]>([]);
  novedades  = signal<Novedad[]>([]);
  solicitudes = signal<Solicitud[]>([]);
  userName   = signal('');

  // Derivados
  stats = computed<DashStats>(() => ({
    totalAulas: this.aulas().length,
    novedadesHoy: this.novedadesHoyCount(),
    solicitudesAbiertas: this.solicitudes().filter(
      s => s.estado === 'pendiente' || s.estado === 'en_proceso'
    ).length
  }));

  greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  todayLabel = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  constructor(
    private auth: AuthService,
    private auxiliarService: AuxiliarService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUserData();
    if (!user) {
      this.loadError.set('No se pudo identificar al usuario.');
      this.isLoading.set(false);
      return;
    }
    this.userName.set(user.nombre);
    this.loadData(user.id_usuario);
  }

  private loadData(idUsuario: number): void {
    this.isLoading.set(true);

    // 1. Intentamos traer la planilla activa.
    this.auxiliarService.getPlanillaActiva(idUsuario)
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (planilla) => {
          if (!planilla) {
            // No hay planilla activa en este momento (estás fuera del horario de un turno).
            this.hasActiveShift.set(false);
            this.loadSecondaryOnly(idUsuario);
            return;
          }
          this.hasActiveShift.set(true);
          this.planilla.set(planilla);
          this.loadShiftDetails(planilla, idUsuario);
        },
        error: () => {
          this.hasActiveShift.set(false);
          this.loadSecondaryOnly(idUsuario);
        }
      });
  }

  /**
   * Carga turno + aulas del edificio asignado a la planilla,
   * en paralelo con novedades y solicitudes del auxiliar.
   */
  private loadShiftDetails(planilla: Planilla, idUsuario: number): void {
    forkJoin({
      turno: this.auxiliarService.getTurno(planilla.id_turno).pipe(catchError(() => of(null))),
      aulasP1: this.auxiliarService.getAulasEdificio(planilla.id_edificio, planilla.piso_1)
                   .pipe(catchError(() => of([] as Aula[]))),
      aulasP2: planilla.piso_2
        ? this.auxiliarService.getAulasEdificio(planilla.id_edificio, planilla.piso_2)
              .pipe(catchError(() => of([] as Aula[])))
        : of([] as Aula[]),
      aulasP3: planilla.piso_3
        ? this.auxiliarService.getAulasEdificio(planilla.id_edificio, planilla.piso_3)
              .pipe(catchError(() => of([] as Aula[])))
        : of([] as Aula[]),
      novedades:   this.auxiliarService.getMisNovedades().pipe(catchError(() => of([] as Novedad[]))),
      solicitudes: this.auxiliarService.getMisSolicitudes().pipe(catchError(() => of([] as Solicitud[]))),
    }).subscribe(({ turno, aulasP1, aulasP2, aulasP3, novedades, solicitudes }) => {
      this.turno.set(turno);
      this.aulas.set([...aulasP1, ...aulasP2, ...aulasP3]);
      this.novedades.set(novedades);
      this.solicitudes.set(solicitudes);
      this.isLoading.set(false);
    });
  }

  /**
   * Sin planilla activa: igual cargamos novedades/solicitudes para los KPIs.
   */
  private loadSecondaryOnly(_idUsuario: number): void {
    forkJoin({
      novedades:   this.auxiliarService.getMisNovedades().pipe(catchError(() => of([] as Novedad[]))),
      solicitudes: this.auxiliarService.getMisSolicitudes().pipe(catchError(() => of([] as Solicitud[]))),
    }).subscribe(({ novedades, solicitudes }) => {
      this.novedades.set(novedades);
      this.solicitudes.set(solicitudes);
      this.isLoading.set(false);
    });
  }

  // ── Helpers de UI ─────────────────────────────────────────
  private novedadesHoyCount(): number {
    const hoy = new Date().toISOString().slice(0, 10);
    return this.novedades().filter(n => n.fecha_novedad?.slice(0, 10) === hoy).length;
  }

  /**
   * Formatea "08:00:00" → "08:00 AM"
   */
  formatHora(hora?: string): string {
    if (!hora) return '—';
    const [h, m] = hora.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  }

  /**
   * Tiempo restante hasta hora_fin del turno (en formato "2h 30min")
   */
  tiempoRestante(): string {
    const t = this.turno();
    if (!t?.hora_fin) return '';
    const [h, m] = t.hora_fin.split(':').map(Number);
    const fin = new Date();
    fin.setHours(h, m, 0, 0);
    const diff = fin.getTime() - Date.now();
    if (diff <= 0) return 'Turno finalizado';
    const horas = Math.floor(diff / 3_600_000);
    const mins  = Math.floor((diff % 3_600_000) / 60_000);
    if (horas === 0) return `${mins} min restantes`;
    return `${horas}h ${mins}min restantes`;
  }
}