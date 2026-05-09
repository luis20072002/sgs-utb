// src/app/pages/home/planilla/planilla.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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
import { environment } from '../../../../environments/environment';

/** Shape del horario-clase que devuelve el backend */
export interface HorarioClase {
  id_horario_clase: number;
  id_planilla:      number;
  id_aula:          number;
  id_docente:       number;
  id_curso:         number;
  hora_inicio:      string;
  hora_fin:         string;
  dia_semana:       number | null;
}

/** Shape mínimo del docente que necesitamos */
interface DocenteMin {
  id_docente: number;
  nombre:     string;
  apellido:   string;
}

/** Shape mínimo del curso */
interface CursoMin {
  id_curso:     number;
  nombre_curso: string;
  codi_curso:   string;
}

/** Aula enriquecida con la info de su clase (si existe en la planilla) */
export interface AulaEnriquecida extends Aula {
  clase:    HorarioClase | null;
  docente:  DocenteMin   | null;
  curso:    CursoMin     | null;
}

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

  /** Aulas que SÍ tienen clase asignada en la planilla */
  aulasConClase    = signal<AulaEnriquecida[]>([]);
  /** Aulas de los pisos pero SIN clase en la planilla */
  aulasSinClase    = signal<AulaEnriquecida[]>([]);
  /** Si mostrar/ocultar la sección de aulas sin clase */
  mostrarSinClase  = signal(false);

  /** Mapa id_aula → Registro */
  registrosMap = signal<Map<number, Registro>>(new Map());

  aulasCompletadas = computed(() => this.registrosMap().size);

  progreso = computed(() => {
    const total = this.aulasConClase().length;
    if (!total) return 0;
    return Math.round((this.aulasCompletadas() / total) * 100);
  });

  /* ── Modal ── */
  modalOpen        = signal(false);
  aulaSeleccionada = signal<AulaEnriquecida | null>(null);

  constructor(
    private auth: AuthService,
    private auxiliarService: AuxiliarService,
    private registrosService: RegistrosService,
    private http: HttpClient,
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
    // Solo usamos getPlanillaActiva — el backend ya valida que el turno
    // esté vigente en este momento. Si falla (fuera de turno, sin planilla,
    // error de red), mostramos el empty state directamente.
    this.auxiliarService
      .getPlanillaActiva(idUsuario)
      .pipe(
        catchError((err) => {
          // 404 = sin turno activo ahora mismo → mensaje amigable
          // Cualquier otro error → mensaje genérico
          const status = err?.status;
          if (status === 404 || status === 400) {
            this.errorMsg.set('No tienes un turno activo en este momento.');
          } else {
            this.errorMsg.set('No se pudo cargar la planilla. Intenta recargar la página.');
          }
          this.isLoading.set(false);
          return of(null);
        })
      )
      .subscribe({
        next: (planilla) => {
          if (!planilla) return; // el catchError ya seteó el mensaje
          this.planilla.set(planilla);
          this.loadDetails(planilla);
        },
      });
  }

  private loadDetails(planilla: Planilla): void {
    const base = environment.apiUrl;

    const aulasP1$ = this.auxiliarService
      .getAulasEdificio(planilla.id_edificio, planilla.piso_1)
      .pipe(catchError(() => of([] as Aula[])));

    const aulasP2$ = planilla.piso_2
      ? this.auxiliarService.getAulasEdificio(planilla.id_edificio, planilla.piso_2)
          .pipe(catchError(() => of([] as Aula[])))
      : of([] as Aula[]);

    const aulasP3$ = planilla.piso_3
      ? this.auxiliarService.getAulasEdificio(planilla.id_edificio, planilla.piso_3)
          .pipe(catchError(() => of([] as Aula[])))
      : of([] as Aula[]);

    forkJoin({
      turno:     this.auxiliarService.getTurno(planilla.id_turno).pipe(catchError(() => of(null))),
      aulasP1:   aulasP1$,
      aulasP2:   aulasP2$,
      aulasP3:   aulasP3$,
      registros: this.registrosService.getMisRegistros().pipe(catchError(() => of([] as Registro[]))),
      clases:    this.http.get<HorarioClase[]>(`${base}/horarios-clase/planilla/${planilla.id_planillas}`)
                   .pipe(catchError(() => of([] as HorarioClase[]))),
      docentes:  this.http.get<DocenteMin[]>(`${base}/docentes/`)
                   .pipe(catchError(() => of([] as DocenteMin[]))),
      cursos:    this.http.get<CursoMin[]>(`${base}/cursos/`)
                   .pipe(catchError(() => of([] as CursoMin[]))),
    }).subscribe(({ turno, aulasP1, aulasP2, aulasP3, registros, clases, docentes, cursos }) => {
      this.turno.set(turno);

      const todasLasAulas = [...aulasP1, ...aulasP2, ...aulasP3];

      // Índices para lookup rápido
      const clasesByAula  = new Map(clases.map(c => [c.id_aula, c]));
      const docenteById   = new Map(docentes.map(d => [d.id_docente, d]));
      const cursoById     = new Map(cursos.map(c => [c.id_curso, c]));

      const enriquecidas: AulaEnriquecida[] = todasLasAulas.map(aula => {
        const clase   = clasesByAula.get(aula.id_aula) ?? null;
        const docente = clase ? (docenteById.get(clase.id_docente) ?? null) : null;
        const curso   = clase ? (cursoById.get(clase.id_curso) ?? null) : null;
        return { ...aula, clase, docente, curso };
      });

      // Filtrar día de la semana (1=lun…7=dom) para clases con dia_semana definido
      const hoy = new Date().getDay(); // 0=dom..6=sab
      const diaSemanaHoy = hoy === 0 ? 7 : hoy; // convertir a 1=lun..7=dom

      const conClase = enriquecidas.filter(a => {
        if (!a.clase) return false;
        // Si el horario tiene dia_semana definido, filtramos por el día actual
        if (a.clase.dia_semana !== null && a.clase.dia_semana !== undefined) {
          return a.clase.dia_semana === diaSemanaHoy;
        }
        // Si dia_semana es null, asumimos que aplica todos los días
        return true;
      });

      const sinClase = enriquecidas.filter(a => !conClase.includes(a));

      this.aulasConClase.set(conClase);
      this.aulasSinClase.set(sinClase);

      this.buildRegistrosMap(conClase, registros);
      this.isLoading.set(false);
    });
  }

  private buildRegistrosMap(aulas: AulaEnriquecida[], registros: Registro[]): void {
    const idsAula = new Set(aulas.map((a) => a.id_aula));
    const map = new Map<number, Registro>();
    registros.filter(r => idsAula.has(r.id_aula)).forEach(r => map.set(r.id_aula, r));
    this.registrosMap.set(map);
  }

  /* ── Helpers ─────────────────────────────────────────────────────── */

  formatHora(hora?: string | null): string {
    if (!hora) return '—';
    const [h, m] = hora.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12    = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  }

  getRegistro(aula: AulaEnriquecida): Registro | null {
    return this.registrosMap().get(aula.id_aula) ?? null;
  }

  nombreDocente(aula: AulaEnriquecida): string {
    if (!aula.docente) return 'Sin asignar';
    return `${aula.docente.nombre} ${aula.docente.apellido}`;
  }

  /* ── Modal ─────────────────────────────────────────────────────────── */

  registrarAula(aula: AulaEnriquecida): void {
    this.aulaSeleccionada.set(aula);
    this.modalOpen.set(true);
  }

  onModalCancelado(): void {
    this.modalOpen.set(false);
    this.aulaSeleccionada.set(null);
  }

  onRegistroGuardado(event: RegistroGuardadoEvent): void {
    const map = new Map(this.registrosMap());
    map.set(event.aula.id_aula, event.registro);
    this.registrosMap.set(map);
    this.modalOpen.set(false);
    this.aulaSeleccionada.set(null);
  }
}