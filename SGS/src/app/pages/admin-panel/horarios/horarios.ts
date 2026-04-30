// src/app/pages/admin-panel/horarios/horarios.ts
import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  HorariosService,
  HorarioAuxiliar,
  HorarioAuxiliarCreate,
  HorarioExcepcion,
  HorarioExcepcionCreate,
  Turno,
  UsuarioAuxiliar,
} from '../../../services/horarios.service';

// ─── Tipos internos ───────────────────────────────────────────────────────────

/** Días de la semana (lunes=1 … domingo=7) */
const DIAS = [
  { num: 1, label: 'Lunes',     short: 'Lun' },
  { num: 2, label: 'Martes',    short: 'Mar' },
  { num: 3, label: 'Miércoles', short: 'Mié' },
  { num: 4, label: 'Jueves',    short: 'Jue' },
  { num: 5, label: 'Viernes',   short: 'Vie' },
  { num: 6, label: 'Sábado',    short: 'Sáb' },
  { num: 7, label: 'Domingo',   short: 'Dom' },
];

/** Celda del grid de horario */
interface DayCell {
  dia: typeof DIAS[0];
  horario: HorarioAuxiliar | null;
  excepciones: HorarioExcepcion[];
}

/** Combinaciones de turnos válidas */
type TurnoPair = { t1: number; t2: number | null; label: string };

// ─── Formularios ─────────────────────────────────────────────────────────────

interface FormHorario {
  dia_semana: number;
  id_turno_1: number | '';
  id_turno_2: number | null;
  periodo_vigencia: string;
}

interface FormExcepcion {
  fecha: string;
  tipo: 'cambio_turno' | 'ausencia_justificada';
  id_turno_nuevo: number | null;
  motivo: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-admin-horarios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: 'horarios.html',
  styleUrls: ['horarios.css'],
})
export class AdminHorariosComponent implements OnInit {
  private svc = inject(HorariosService);

  readonly DIAS = DIAS;

  // ── Datos base ────────────────────────────────────────────────────────────
  auxiliares  = signal<UsuarioAuxiliar[]>([]);
  turnos      = signal<Turno[]>([]);
  loading     = signal(true);
  errorMsg    = signal('');

  // ── Auxiliar seleccionado ─────────────────────────────────────────────────
  selectedAux   = signal<UsuarioAuxiliar | null>(null);
  horarios      = signal<HorarioAuxiliar[]>([]);
  excepciones   = signal<HorarioExcepcion[]>([]);
  loadingAux    = signal(false);
  searchTerm    = signal('');
  periodoFiltro = signal('');

  readonly filteredAuxiliares = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    return this.auxiliares().filter(a =>
      !term ||
      a.nombre.toLowerCase().includes(term) ||
      a.correo.toLowerCase().includes(term)
    );
  });

  // ── Grid de la semana para el auxiliar seleccionado ───────────────────────
  readonly gridDias = computed<DayCell[]>(() => {
    const periodo = this.periodoFiltro();
    const hors = periodo
      ? this.horarios().filter(h => h.periodo_vigencia === periodo)
      : this.horarios();

    return DIAS.map(dia => ({
      dia,
      horario: hors.find(h => h.dia_semana === dia.num) ?? null,
      excepciones: this.excepciones().filter(e => {
        if (!e.fecha) return false;
        const diaFecha = new Date(e.fecha + 'T00:00:00').getDay();
        // Convertir: js domingo=0 → nuestro 7; lunes=1 → 1 etc.
        const diaNum = diaFecha === 0 ? 7 : diaFecha;
        return diaNum === dia.num;
      }),
    }));
  });

  /** Períodos únicos presentes en los horarios del auxiliar */
  readonly periodosDisponibles = computed(() => {
    const set = new Set(this.horarios().map(h => h.periodo_vigencia));
    return Array.from(set).sort();
  });

  /** Combinaciones de turno válidas (1 solo o 2 consecutivos) */
  readonly turnosPairs = computed<TurnoPair[]>(() => {
    const ts = this.turnos();
    const pairs: TurnoPair[] = [];
    for (const t of ts) {
      pairs.push({ t1: t.id_turno, t2: null, label: t.nombre_turno });
    }
    // Pares consecutivos: t1.hora_fin === t2.hora_inicio
    for (let i = 0; i < ts.length; i++) {
      for (let j = 0; j < ts.length; j++) {
        if (i === j) continue;
        if (ts[i].hora_fin === ts[j].hora_inicio) {
          pairs.push({
            t1: ts[i].id_turno,
            t2: ts[j].id_turno,
            label: `${ts[i].nombre_turno} + ${ts[j].nombre_turno}`,
          });
        }
      }
    }
    return pairs;
  });

  // ── Modal: agregar/editar horario ─────────────────────────────────────────
  showHorarioModal = signal(false);
  editingHorario   = signal<HorarioAuxiliar | null>(null);
  savingHorario    = signal(false);
  errorHorario     = signal('');

  formHorario: FormHorario = {
    dia_semana: 1,
    id_turno_1: '',
    id_turno_2: null,
    periodo_vigencia: '',
  };

  /** Par de turno actualmente seleccionado en el form */
  selectedPairKey = signal('');

  // ── Modal: agregar excepción ──────────────────────────────────────────────
  showExcepModal  = signal(false);
  savingExcep     = signal(false);
  errorExcep      = signal('');

  formExcep: FormExcepcion = {
    fecha: '',
    tipo: 'ausencia_justificada',
    id_turno_nuevo: null,
    motivo: '',
  };

  // ── Modal: confirmar eliminar horario ──────────────────────────────────────
  showDeleteHorario   = signal(false);
  horarioToDelete     = signal<HorarioAuxiliar | null>(null);
  deletingHorario     = signal(false);

  // ── Modal: confirmar eliminar excepción ───────────────────────────────────
  showDeleteExcep   = signal(false);
  excepToDelete     = signal<HorarioExcepcion | null>(null);
  deletingExcep     = signal(false);

  // ─────────────────────────────────────────────────────────────────────────
  //  Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadBase();
  }

  private loadBase(): void {
    this.loading.set(true);
    forkJoin({
      usuarios: this.svc.getUsuarios().pipe(catchError(() => of([] as UsuarioAuxiliar[]))),
      turnos:   this.svc.getTurnos().pipe(catchError(() => of([] as Turno[]))),
    }).subscribe(({ usuarios, turnos }) => {
      // Solo auxiliares activos (rol_id === 2)
      this.auxiliares.set(
        usuarios.filter(u => (u.rol?.rol_id === 2) && u.estado)
      );
      this.turnos.set(turnos);
      this.loading.set(false);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Selección de auxiliar
  // ─────────────────────────────────────────────────────────────────────────

  selectAuxiliar(aux: UsuarioAuxiliar): void {
    this.selectedAux.set(aux);
    this.periodoFiltro.set('');
    this.loadHorariosAux(aux.id_usuario);
  }

  private loadHorariosAux(idUsuario: number): void {
    this.loadingAux.set(true);
    forkJoin({
      horarios:    this.svc.getHorariosPorUsuario(idUsuario).pipe(catchError(() => of([] as HorarioAuxiliar[]))),
      excepciones: this.svc.getExcepcionesPorUsuario(idUsuario).pipe(catchError(() => of([] as HorarioExcepcion[]))),
    }).subscribe(({ horarios, excepciones }) => {
      this.horarios.set(horarios);
      this.excepciones.set(excepciones);
      // Si hay períodos, auto-seleccionar el más reciente
      const periodos = [...new Set(horarios.map(h => h.periodo_vigencia))].sort();
      if (periodos.length > 0) this.periodoFiltro.set(periodos[periodos.length - 1]);
      this.loadingAux.set(false);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Modal: Horario
  // ─────────────────────────────────────────────────────────────────────────

  openAddHorario(dia?: number): void {
    this.editingHorario.set(null);
    this.formHorario = {
      dia_semana: dia ?? 1,
      id_turno_1: '',
      id_turno_2: null,
      periodo_vigencia: this.periodoFiltro() || '',
    };
    this.selectedPairKey.set('');
    this.errorHorario.set('');
    this.showHorarioModal.set(true);
  }

  openEditHorario(h: HorarioAuxiliar): void {
    this.editingHorario.set(h);
    this.formHorario = {
      dia_semana: h.dia_semana,
      id_turno_1: h.id_turno_1,
      id_turno_2: h.id_turno_2,
      periodo_vigencia: h.periodo_vigencia,
    };
    // Reconstruir la key del par seleccionado
    const key = h.id_turno_2
      ? `${h.id_turno_1}:${h.id_turno_2}`
      : `${h.id_turno_1}:`;
    this.selectedPairKey.set(key);
    this.errorHorario.set('');
    this.showHorarioModal.set(true);
  }

  closeHorarioModal(): void {
    if (this.savingHorario()) return;
    this.showHorarioModal.set(false);
  }

  onPairChange(key: string): void {
    this.selectedPairKey.set(key);
    const [t1str, t2str] = key.split(':');
    this.formHorario.id_turno_1 = t1str ? Number(t1str) : '';
    this.formHorario.id_turno_2 = t2str ? Number(t2str) : null;
  }

  saveHorario(): void {
    const aux = this.selectedAux();
    if (!aux) return;

    if (!this.formHorario.id_turno_1) {
      this.errorHorario.set('Selecciona al menos un turno.');
      return;
    }
    if (!this.formHorario.periodo_vigencia || !/^\d{6}$/.test(this.formHorario.periodo_vigencia)) {
      this.errorHorario.set('El período debe tener formato YYYYSS (6 dígitos). Ej: 202501');
      return;
    }

    this.savingHorario.set(true);
    this.errorHorario.set('');

    const editing = this.editingHorario();

    if (editing) {
      const update = {
        dia_semana: this.formHorario.dia_semana,
        id_turno_1: Number(this.formHorario.id_turno_1),
        id_turno_2: this.formHorario.id_turno_2,
        periodo_vigencia: this.formHorario.periodo_vigencia,
      };
      this.svc.actualizarHorario(editing.id_horario, update).subscribe({
        next: (h) => {
          this.horarios.update(list => list.map(x => x.id_horario === h.id_horario ? h : x));
          this.savingHorario.set(false);
          this.showHorarioModal.set(false);
        },
        error: (err) => {
          this.errorHorario.set(err?.error?.detail ?? 'No se pudo guardar.');
          this.savingHorario.set(false);
        },
      });
    } else {
      const create: HorarioAuxiliarCreate = {
        id_usuario: aux.id_usuario,
        dia_semana: this.formHorario.dia_semana,
        id_turno_1: Number(this.formHorario.id_turno_1),
        id_turno_2: this.formHorario.id_turno_2,
        periodo_vigencia: this.formHorario.periodo_vigencia,
      };
      this.svc.crearHorario(create).subscribe({
        next: (h) => {
          this.horarios.update(list => [...list, h]);
          this.savingHorario.set(false);
          this.showHorarioModal.set(false);
        },
        error: (err) => {
          this.errorHorario.set(err?.error?.detail ?? 'No se pudo crear el horario.');
          this.savingHorario.set(false);
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Eliminar horario
  // ─────────────────────────────────────────────────────────────────────────

  requestDeleteHorario(h: HorarioAuxiliar): void {
    this.horarioToDelete.set(h);
    this.showDeleteHorario.set(true);
  }

  confirmDeleteHorario(): void {
    const h = this.horarioToDelete();
    if (!h) return;
    this.deletingHorario.set(true);
    this.svc.eliminarHorario(h.id_horario).subscribe({
      next: () => {
        this.horarios.update(list => list.filter(x => x.id_horario !== h.id_horario));
        this.deletingHorario.set(false);
        this.showDeleteHorario.set(false);
      },
      error: () => {
        this.deletingHorario.set(false);
        this.showDeleteHorario.set(false);
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Modal: Excepción
  // ─────────────────────────────────────────────────────────────────────────

  openAddExcepcion(): void {
    this.formExcep = {
      fecha: new Date().toISOString().slice(0, 10),
      tipo: 'ausencia_justificada',
      id_turno_nuevo: null,
      motivo: '',
    };
    this.errorExcep.set('');
    this.showExcepModal.set(true);
  }

  closeExcepModal(): void {
    if (this.savingExcep()) return;
    this.showExcepModal.set(false);
  }

  saveExcepcion(): void {
    const aux = this.selectedAux();
    if (!aux) return;

    if (!this.formExcep.fecha) {
      this.errorExcep.set('La fecha es obligatoria.');
      return;
    }
    if (this.formExcep.tipo === 'cambio_turno' && !this.formExcep.id_turno_nuevo) {
      this.errorExcep.set('Selecciona el turno nuevo para el cambio de turno.');
      return;
    }

    this.savingExcep.set(true);
    this.errorExcep.set('');

    const datos: HorarioExcepcionCreate = {
      id_usuario: aux.id_usuario,
      fecha: this.formExcep.fecha,
      tipo: this.formExcep.tipo,
      id_turno_nuevo: this.formExcep.tipo === 'cambio_turno' ? this.formExcep.id_turno_nuevo : null,
      motivo: this.formExcep.motivo || null,
    };

    this.svc.crearExcepcion(datos).subscribe({
      next: (e) => {
        this.excepciones.update(list => [...list, e]);
        this.savingExcep.set(false);
        this.showExcepModal.set(false);
      },
      error: (err) => {
        this.errorExcep.set(err?.error?.detail ?? 'No se pudo registrar la excepción.');
        this.savingExcep.set(false);
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Eliminar excepción
  // ─────────────────────────────────────────────────────────────────────────

  requestDeleteExcep(e: HorarioExcepcion): void {
    this.excepToDelete.set(e);
    this.showDeleteExcep.set(true);
  }

  confirmDeleteExcep(): void {
    const e = this.excepToDelete();
    if (!e) return;
    this.deletingExcep.set(true);
    this.svc.eliminarExcepcion(e.id_excepcion).subscribe({
      next: () => {
        this.excepciones.update(list => list.filter(x => x.id_excepcion !== e.id_excepcion));
        this.deletingExcep.set(false);
        this.showDeleteExcep.set(false);
      },
      error: () => {
        this.deletingExcep.set(false);
        this.showDeleteExcep.set(false);
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────────────────────

  getTurnoLabel(id: number): string {
    const t = this.turnos().find(t => t.id_turno === id);
    return t ? t.nombre_turno : `Turno ${id}`;
  }

  getTurnoHora(id: number): string {
    const t = this.turnos().find(t => t.id_turno === id);
    if (!t) return '';
    return `${t.hora_inicio.slice(0, 5)} – ${t.hora_fin.slice(0, 5)}`;
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  getUserInitials(nombre: string): string {
    return nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  hasExcepcionesProximas(): boolean {
    const hoy = new Date();
    const en7 = new Date(hoy); en7.setDate(hoy.getDate() + 7);
    return this.excepciones().some(e => {
      const d = new Date(e.fecha + 'T00:00:00');
      return d >= hoy && d <= en7;
    });
  }

  /** Excepciones ordenadas por fecha desc */
  readonly sortedExcepciones = computed(() =>
    [...this.excepciones()].sort((a, b) => b.fecha.localeCompare(a.fecha))
  );

  getDiaLabel(num: number): string {
    return DIAS.find(d => d.num === num)?.label ?? `Día ${num}`;
  }
}