// src/app/pages/home/planilla/planilla.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../../services/auth';
import {
  AuxiliarService,
  Planilla,
  Turno,
  Aula,
} from '../../../services/auxiliar.service';
import { RegistrosService, Registro } from '../../../services/registros.service';
import { RegistroModalComponent, RegistroGuardadoEvent } from './registro-modal/registro-modal';

@Component({
  selector: 'app-home-planilla',
  standalone: true,
  imports: [CommonModule, RegistroModalComponent],
  templateUrl: './planilla.html',
  styleUrls: ['./planilla.css'],
})
export class HomePlanillaComponent implements OnInit {
  isLoading = signal(true);
  errorMsg  = signal('');

  planilla = signal<Planilla | null>(null);
  turno    = signal<Turno | null>(null);

  /** Aulas de los pisos asignados en la planilla (ya filtradas por piso en el backend) */
  aulas = signal<Aula[]>([]);

  /** Mapa id_aula → Registro para saber qué aulas ya tienen registro hoy */
  registrosMap = signal<Map<number, Registro>>(new Map());

  /** Progreso real: cantidad de aulas que ya tienen registro */
  aulasCompletadas = computed(() => this.registrosMap().size);

  progreso = computed(() => {
    const total = this.aulas().length;
    if (!total) return 0;
    return Math.round((this.aulasCompletadas() / total) * 100);
  });

  /* ── Modal ── */
  modalOpen    = signal(false);
  aulaSeleccionada = signal<Aula | null>(null);

  constructor(
    private auth: AuthService,
    private auxiliarService: AuxiliarService,
    private registrosService: RegistrosService,
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUserData();
    if (!user) {
      this.errorMsg.set('No se pudo identificar al usuario.');
      this.isLoading.set(false);
      return;
    }
    this.load(user.id_usuario);
  }

  /* ── Carga principal ─────────────────────────────────────────────── */

  private load(idUsuario: number): void {
    this.auxiliarService
      .getPlanillaActiva(idUsuario)
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (planilla) => {
          if (!planilla) {
            this.errorMsg.set('No tienes una planilla activa en este momento.');
            this.isLoading.set(false);
            return;
          }
          this.planilla.set(planilla);
          this.loadDetails(planilla);
        },
      });
  }

  private loadDetails(planilla: Planilla): void {
    // Construimos las peticiones de aulas solo para los pisos definidos.
    // El endpoint ya filtra por piso → solo llegan las aulas que le corresponden.
    const aulasP1$ = this.auxiliarService
      .getAulasEdificio(planilla.id_edificio, planilla.piso_1)
      .pipe(catchError(() => of([] as Aula[])));

    const aulasP2$ = planilla.piso_2
      ? this.auxiliarService
          .getAulasEdificio(planilla.id_edificio, planilla.piso_2)
          .pipe(catchError(() => of([] as Aula[])))
      : of([] as Aula[]);

    const aulasP3$ = planilla.piso_3
      ? this.auxiliarService
          .getAulasEdificio(planilla.id_edificio, planilla.piso_3)
          .pipe(catchError(() => of([] as Aula[])))
      : of([] as Aula[]);

    forkJoin({
      turno:    this.auxiliarService.getTurno(planilla.id_turno).pipe(catchError(() => of(null))),
      aulasP1:  aulasP1$,
      aulasP2:  aulasP2$,
      aulasP3:  aulasP3$,
      registros: this.registrosService.getMisRegistros().pipe(catchError(() => of([] as Registro[]))),
    }).subscribe(({ turno, aulasP1, aulasP2, aulasP3, registros }) => {
      this.turno.set(turno);

      const todasLasAulas = [...aulasP1, ...aulasP2, ...aulasP3];
      this.aulas.set(todasLasAulas);

      // Construir el mapa de registros filtrando por la planilla activa
      this.buildRegistrosMap(planilla.id_planillas, todasLasAulas, registros);

      this.isLoading.set(false);
    });
  }

  /**
   * Construye el mapa id_aula → Registro para los registros
   * que pertenecen a la planilla activa actual.
   */
  private buildRegistrosMap(
    idPlanilla: number,
    aulas: Aula[],
    registros: Registro[]
  ): void {
    const idsAula = new Set(aulas.map((a) => a.id_aula));
    const map = new Map<number, Registro>();

    registros
      .filter((r) => r.id_planilla === idPlanilla && idsAula.has(r.id_aula))
      .forEach((r) => map.set(r.id_aula, r));

    this.registrosMap.set(map);
  }

  /* ── Helpers de template ─────────────────────────────────────────── */

  formatHora(hora?: string | null): string {
    if (!hora) return '—';
    const [h, m] = hora.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  }

  /** Devuelve el registro existente de un aula, o null si aún no se ha registrado */
  getRegistro(aula: Aula): Registro | null {
    return this.registrosMap().get(aula.id_aula) ?? null;
  }

  /* ── Modal ─────────────────────────────────────────────────────────── */

  registrarAula(aula: Aula): void {
    this.aulaSeleccionada.set(aula);
    this.modalOpen.set(true);
  }

  onModalCancelado(): void {
    this.modalOpen.set(false);
    this.aulaSeleccionada.set(null);
  }

  onRegistroGuardado(event: RegistroGuardadoEvent): void {
    // Actualizar el mapa de registros con el nuevo/actualizado registro
    const map = new Map(this.registrosMap());
    map.set(event.aula.id_aula, event.registro);
    this.registrosMap.set(map);

    this.modalOpen.set(false);
    this.aulaSeleccionada.set(null);
  }
}