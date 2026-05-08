// src/app/pages/home/horario/horario.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../../services/auth';
import {
  AuxiliarService,
  HorarioAuxiliar,
  HorarioExcepcion,
  Turno
} from '../../../services/auxiliar.service';

interface DayCell {
  num:        number;          // 1-7
  label:      string;          // "Lunes"
  shortLabel: string;          // "Lun"
  date:       Date;            // fecha real de esa columna en la semana actual
  horarios:   HorarioAuxiliar[];
  excepciones: HorarioExcepcion[];
  isToday:    boolean;
}

const DIAS = [
  { num: 1, label: 'Lunes',     short: 'Lun' },
  { num: 2, label: 'Martes',    short: 'Mar' },
  { num: 3, label: 'Miércoles', short: 'Mié' },
  { num: 4, label: 'Jueves',    short: 'Jue' },
  { num: 5, label: 'Viernes',   short: 'Vie' },
  { num: 6, label: 'Sábado',    short: 'Sáb' },
  { num: 7, label: 'Domingo',   short: 'Dom' }
];

@Component({
  selector: 'app-home-horario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './horario.html',
  styleUrls: ['./horario.css']
})
export class HomeHorarioComponent implements OnInit {
  isLoading = signal(true);
  errorMsg  = signal('');

  horarios    = signal<HorarioAuxiliar[]>([]);
  excepciones = signal<HorarioExcepcion[]>([]);
  /** Mapa id_turno → Turno, para mostrar el rango horario en cada celda */
  turnos = signal<Record<number, Turno>>({});

  /** Etiqueta de la semana actual (lunes a domingo) */
  weekLabel = '';

  /** Celdas de cada día con sus horarios y excepciones agrupados */
  days = computed<DayCell[]>(() => this.buildDays());

  constructor(
    private auth: AuthService,
    private auxiliarService: AuxiliarService
  ) {}

  ngOnInit(): void {
    this.weekLabel = this.computeWeekLabel();
    const user = this.auth.getUserData();
    if (!user) {
      this.errorMsg.set('No se pudo identificar al usuario.');
      this.isLoading.set(false);
      return;
    }

    forkJoin({
      horarios:    this.auxiliarService.getMiHorario(user.id_usuario)
                       .pipe(catchError(() => of([] as HorarioAuxiliar[]))),
      excepciones: this.auxiliarService.getMisExcepciones(user.id_usuario)
                       .pipe(catchError(() => of([] as HorarioExcepcion[]))),
      turnos:      this.auxiliarService.getTurnos()
                       .pipe(catchError(() => of([] as Turno[])))
    }).subscribe(({ horarios, excepciones, turnos }) => {
      this.horarios.set(horarios);
      this.excepciones.set(excepciones);

      const map: Record<number, Turno> = {};
      for (const t of turnos) map[t.id_turno] = t;
      this.turnos.set(map);

      this.isLoading.set(false);
    });
  }

  // ── Construir las 7 celdas del calendario ──
  private buildDays(): DayCell[] {
    // Calculamos las fechas de la semana actual (lunes a domingo)
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // domingo=0 → 7
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const todayKey = today.toISOString().slice(0, 10);

    return DIAS.map((d, idx) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + idx);
      const dateKey = date.toISOString().slice(0, 10);

      return {
        num:        d.num,
        label:      d.label,
        shortLabel: d.short,
        date,
        horarios:    this.horarios().filter(h => h.dia_semana === d.num),
        excepciones: this.excepciones().filter(e => e.fecha?.slice(0, 10) === dateKey),
        isToday:     dateKey === todayKey
      };
    });
  }

  private computeWeekLabel(): string {
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d: Date) =>
      d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return `${fmt(monday)} – ${fmt(sunday)}`;
  }

  // ── Helpers ──
  turnoLabel(idTurno: number): string {
    const t = this.turnos()[idTurno];
    if (!t) return `Turno ${idTurno}`;
    return t.nombre_turno;
  }

  turnoHora(idTurno: number): string {
    const t = this.turnos()[idTurno];
    if (!t) return '';
    return `${this.formatHora(t.hora_inicio)} - ${this.formatHora(t.hora_fin)}`;
  }

  excepcionLabel(e: HorarioExcepcion): string {
    if (e.tipo === 'cambio_turno') {
      const t = e.id_turno_nuevo ? this.turnoLabel(e.id_turno_nuevo) : '';
      return `Cambio de turno${t ? ' → ' + t : ''}`;
    }
    return 'Ausencia justificada';
  }

  formatHora(hora?: string | null): string {
    if (!hora) return '—';
    const [h, m] = hora.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  }
}