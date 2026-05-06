// src/app/pages/admin-panel/solicitudes/solicitudes.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog';
import { environment } from '../../../../environments/environment';

// ─── Modelos locales ────────────────────────────────────────────────────────

export interface Solicitud {
  id_solicitud:           number;
  id_registro:            number;
  descripcion:            string;
  estado:                 'pendiente' | 'en_proceso' | 'resuelta';
  fecha_solicitud:        string;
  fecha_resolucion?:      string | null;
  nota_resolucion?:       string | null;
  resuelta_por_auxiliar?: boolean;
}

export interface Registro {
  id_registro:       number;
  id_usuario:        number;   // auxiliar
  id_aula:           number;
  fecha_registro:    string;
  asistencia_docente: boolean;
}

export interface Aula {
  id_aula:     number;
  codigo:      string;
  nombre_aula: string | null;
  piso:        number;
  capacidad:   number;
  id_edificio: number;
}

export interface Edificio {
  id_edificio:    number;
  nombre:         string;
  codigo:         string;
  cantidad_pisos: number;
  estado:         boolean;
}

export interface UsuarioAuxiliar {
  id_usuario: number;
  nombre:     string;
  correo:     string;
  estado:     boolean;
}

/** Vista enriquecida: solicitud + contexto de aula/auxiliar */
export interface SolicitudVista extends Solicitud {
  aula?:       Aula;
  edificio?:   Edificio;
  auxiliar?:   UsuarioAuxiliar;
}

type EstadoFiltro = 'todos' | 'pendiente' | 'en_proceso' | 'resuelta';

/**
 * /admin/solicitudes
 *
 * RF: el administrador puede visualizar TODAS las solicitudes del sistema,
 * filtrarlas por estado, edificio y rango de fechas, y cambiar el estado
 * de cualquier solicitud en cualquier momento.
 *
 * La pantalla incluye también una sección de análisis visual con:
 *  - Solicitudes por mes
 *  - Aulas con más solicitudes
 *  - Distribución por estado (doughnut)
 *  - Tiempo promedio de resolución por mes
 */
@Component({
  selector: 'app-admin-solicitudes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent, BaseChartDirective],
  templateUrl: 'solicitudes.html',
  styleUrls: ['solicitudes.css'],
})
export class AdminSolicitudesComponent implements OnInit {
  private fb   = inject(FormBuilder);
  private http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ── Datos fuente ─────────────────────────────────────────────────────────
  solicitudes = signal<SolicitudVista[]>([]);
  edificios   = signal<Edificio[]>([]);
  loading     = signal(true);
  errorMsg    = signal('');

  // ── Filtros ──────────────────────────────────────────────────────────────
  filtroEstado    = signal<EstadoFiltro>('todos');
  filtroEdificio  = signal<number | null>(null);
  fechaInicio     = signal('');
  fechaFin        = signal('');
  searchTerm      = signal('');

  // ── Paginación ────────────────────────────────────────────────────────────
  pageSize  = 12;
  pageIndex = signal(0);

  // ── Counts para tabs ─────────────────────────────────────────────────────
  readonly counts = computed(() => {
    const all = this.solicitudes();
    return {
      todos:      all.length,
      pendiente:  all.filter(s => s.estado === 'pendiente').length,
      en_proceso: all.filter(s => s.estado === 'en_proceso').length,
      resuelta:   all.filter(s => s.estado === 'resuelta').length,
    };
  });

  // ── Lista filtrada ────────────────────────────────────────────────────────
  readonly filteredAll = computed(() => {
    const estado   = this.filtroEstado();
    const edificio = this.filtroEdificio();
    const term     = this.searchTerm().trim().toLowerCase();
    const desde    = this.fechaInicio();
    const hasta    = this.fechaFin();

    return this.solicitudes().filter(s => {
      if (estado !== 'todos' && s.estado !== estado) return false;
      if (edificio && s.edificio?.id_edificio !== edificio) return false;
      if (desde) {
        const d = new Date(s.fecha_solicitud);
        if (d < new Date(desde)) return false;
      }
      if (hasta) {
        const d = new Date(s.fecha_solicitud);
        const h = new Date(hasta); h.setHours(23, 59, 59);
        if (d > h) return false;
      }
      if (term) {
        const hay = [
          s.descripcion,
          s.aula?.codigo ?? '',
          s.aula?.nombre_aula ?? '',
          s.auxiliar?.nombre ?? '',
          s.edificio?.nombre ?? '',
        ].join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredAll().length / this.pageSize))
  );

  readonly pagedRows = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.filteredAll().slice(start, start + this.pageSize);
  });

  // ── Modal cambio de estado ────────────────────────────────────────────────
  showEstadoModal   = signal(false);
  editingEstado     = signal<SolicitudVista | null>(null);
  savingEstado      = signal(false);
  saveEstadoError   = signal('');

  estadoForm: FormGroup = this.fb.group({
    estado:          ['', Validators.required],
    nota_resolucion: [''],
  });

  // ── Analytics ─────────────────────────────────────────────────────────────
  loadingStats  = signal(false);
  rangeStart    = signal(this.defaultRangeStart());
  rangeEnd      = signal(this.defaultRangeEnd());
  statsEdificio = signal<number | null>(null);

  // Chart: solicitudes por mes (bar)
  porMesData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  porMesOpts: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    plugins: { legend: { display: false } },
  };

  // Chart: top aulas con más solicitudes (bar horizontal)
  topAulasData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  topAulasOpts: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
    plugins: { legend: { display: false } },
  };

  // Chart: distribución por estado (doughnut)
  distribucionData = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });
  distribucionOpts: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 12 } } },
      tooltip: {
        callbacks: {
          label: ctx => {
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const val   = ctx.parsed as number;
            return ` ${ctx.label}: ${val} (${total ? ((val / total) * 100).toFixed(1) : 0}%)`;
          },
        },
      },
    },
  };

  // Chart: tiempo promedio de resolución por mes (line)
  tiempoResData = signal<ChartData<'line'>>({ labels: [], datasets: [] });
  tiempoResOpts: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, title: { display: true, text: 'Días promedio' } } },
    plugins: { legend: { display: false } },
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.cargar();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Carga de datos
  // ═══════════════════════════════════════════════════════════════════════════

  cargar(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    forkJoin({
      solicitudes: this.http.get<Solicitud[]>(`${this.base}/solicitudes/`).pipe(catchError(() => of([]))),
      registros:   this.http.get<Registro[]>(`${this.base}/registros/`).pipe(catchError(() => of([]))),
      aulas:       this.http.get<Aula[]>(`${this.base}/aulas/`).pipe(catchError(() => of([]))),
      edificios:   this.http.get<Edificio[]>(`${this.base}/edificios/`).pipe(catchError(() => of([]))),
      usuarios:    this.http.get<UsuarioAuxiliar[]>(`${this.base}/usuarios/`).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ solicitudes, registros, aulas, edificios, usuarios }) => {
        this.edificios.set(edificios);

        // Enriquecer cada solicitud con su contexto
        const vistas: SolicitudVista[] = solicitudes.map(s => {
          const reg  = registros.find(r => r.id_registro === s.id_registro);
          const aula = reg ? aulas.find(a => a.id_aula === reg.id_aula) : undefined;
          const ed   = aula ? edificios.find(e => e.id_edificio === aula.id_edificio) : undefined;
          const aux  = reg ? usuarios.find(u => u.id_usuario === reg.id_usuario) : undefined;
          return { ...s, aula, edificio: ed, auxiliar: aux };
        });

        this.solicitudes.set(vistas);
        this.loading.set(false);
        this.recomputeCharts();
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.detail || 'No se pudieron cargar las solicitudes.');
        this.loading.set(false);
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Helpers de presentación
  // ═══════════════════════════════════════════════════════════════════════════

  formatFecha(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  estadoLabel(e: string): string {
    const map: Record<string, string> = {
      pendiente:  'Pendiente',
      en_proceso: 'En proceso',
      resuelta:   'Resuelta',
    };
    return map[e] ?? e;
  }

  estadoIcon(e: string): string {
    const map: Record<string, string> = {
      pendiente:  'schedule',
      en_proceso: 'autorenew',
      resuelta:   'check_circle',
    };
    return map[e] ?? 'help_outline';
  }

  // Opciones de estado válidas según el flujo de negocio:
  //   pendiente → en_proceso | resuelta
  //   en_proceso → resuelta
  //   resuelta → (no puede cambiar)
  estadosSiguientes(actual: string): { value: string; label: string }[] {
    if (actual === 'pendiente')  return [{ value: 'en_proceso', label: 'En proceso' }, { value: 'resuelta', label: 'Resuelta' }];
    if (actual === 'en_proceso') return [{ value: 'resuelta',   label: 'Resuelta' }];
    return [];
  }

  puedeEditarEstado(s: SolicitudVista): boolean {
    return s.estado !== 'resuelta';
  }

  notaRequerida(): boolean {
    return this.estadoForm.get('estado')?.value === 'resuelta';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Filtros y paginación
  // ═══════════════════════════════════════════════════════════════════════════

  setFiltroEstado(value: EstadoFiltro): void {
    this.filtroEstado.set(value);
    this.pageIndex.set(0);
  }

  setFiltroEdificio(value: string): void {
    this.filtroEdificio.set(value ? Number(value) : null);
    this.pageIndex.set(0);
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
  }

  setFechaInicio(value: string): void {
    this.fechaInicio.set(value);
    this.pageIndex.set(0);
  }

  setFechaFin(value: string): void {
    this.fechaFin.set(value);
    this.pageIndex.set(0);
  }

  limpiarFiltros(): void {
    this.filtroEstado.set('todos');
    this.filtroEdificio.set(null);
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.searchTerm.set('');
    this.pageIndex.set(0);
  }

  hayFiltrosActivos(): boolean {
    return this.filtroEstado() !== 'todos'
      || this.filtroEdificio() !== null
      || !!this.fechaInicio()
      || !!this.fechaFin()
      || !!this.searchTerm();
  }

  pagePrev(): void { if (this.pageIndex() > 0) this.pageIndex.update(i => i - 1); }
  pageNext(): void { if (this.pageIndex() < this.totalPages() - 1) this.pageIndex.update(i => i + 1); }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Modal cambio de estado
  // ═══════════════════════════════════════════════════════════════════════════

  openEstadoModal(s: SolicitudVista): void {
    if (!this.puedeEditarEstado(s)) return;
    this.editingEstado.set(s);
    this.saveEstadoError.set('');
    const siguientes = this.estadosSiguientes(s.estado);
    this.estadoForm.reset({
      estado:          siguientes[0]?.value ?? '',
      nota_resolucion: '',
    });
    this.showEstadoModal.set(true);
  }

  closeEstadoModal(): void {
    if (this.savingEstado()) return;
    this.showEstadoModal.set(false);
    this.editingEstado.set(null);
  }

  fieldHasError(field: string): boolean {
    const c = this.estadoForm.get(field);
    return !!(c && c.invalid && c.touched);
  }

  guardarEstado(): void {
    const s = this.editingEstado();
    if (!s) return;

    // Validar nota si es requerida
    if (this.notaRequerida()) {
      this.estadoForm.get('nota_resolucion')!.setValidators([
        Validators.required, Validators.minLength(5)
      ]);
    } else {
      this.estadoForm.get('nota_resolucion')!.clearValidators();
    }
    this.estadoForm.get('nota_resolucion')!.updateValueAndValidity();

    if (this.estadoForm.invalid) {
      this.estadoForm.markAllAsTouched();
      return;
    }

    this.savingEstado.set(true);
    this.saveEstadoError.set('');

    const raw = this.estadoForm.value;
    const payload: Record<string, any> = { estado: raw.estado };
    if (raw.nota_resolucion?.trim()) {
      payload['nota_resolucion'] = raw.nota_resolucion.trim();
    }

    this.http.patch<Solicitud>(
      `${this.base}/solicitudes/${s.id_solicitud}/estado`,
      payload
    ).subscribe({
      next: (updated) => {
        this.solicitudes.update(list =>
          list.map(x => x.id_solicitud === updated.id_solicitud
            ? { ...x, ...updated }
            : x
          )
        );
        this.recomputeCharts();
        this.savingEstado.set(false);
        this.showEstadoModal.set(false);
        this.editingEstado.set(null);
      },
      error: (err) => {
        this.saveEstadoError.set(err?.error?.detail || 'No se pudo actualizar el estado.');
        this.savingEstado.set(false);
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  setStatsRangeStart(v: string): void { this.rangeStart.set(v); this.recomputeCharts(); }
  setStatsRangeEnd(v: string): void   { this.rangeEnd.set(v);   this.recomputeCharts(); }
  setStatsEdificio(v: string): void   { this.statsEdificio.set(v ? Number(v) : null); this.recomputeCharts(); }

  hasStatsData(): boolean {
    return this.solicitudes().length > 0;
  }

  private defaultRangeStart(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  }

  private defaultRangeEnd(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private recomputeCharts(): void {
    const start    = new Date(this.rangeStart());
    const end      = new Date(this.rangeEnd()); end.setHours(23, 59, 59);
    const edFilter = this.statsEdificio();

    const enRango = this.solicitudes().filter(s => {
      const d = new Date(s.fecha_solicitud);
      if (d < start || d > end) return false;
      if (edFilter && s.edificio?.id_edificio !== edFilter) return false;
      return true;
    });

    this.computePorMes(enRango);
    this.computeTopAulas(enRango);
    this.computeDistribucion(enRango);
    this.computeTiempoResolucion(enRango);
  }

  private computePorMes(regs: SolicitudVista[]): void {
    const map = new Map<string, number>();
    regs.forEach(s => {
      const d   = new Date(s.fecha_solicitud);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    this.porMesData.set({
      labels: sorted.map(([k]) => k),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: '#3b5cff',
        borderRadius: 6,
      }],
    });
  }

  private computeTopAulas(regs: SolicitudVista[]): void {
    const map = new Map<string, number>();
    regs.forEach(s => {
      const label = s.aula ? `${s.aula.codigo}` : `Reg #${s.id_registro}`;
      map.set(label, (map.get(label) ?? 0) + 1);
    });
    const sorted = Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
    this.topAulasData.set({
      labels: sorted.map(([k]) => k),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: sorted.map((_, i) =>
          i === 0 ? '#dc2626' : i < 3 ? '#f59e0b' : '#3b5cff'
        ),
        borderRadius: 6,
        barThickness: 20,
      }],
    });
  }

  private computeDistribucion(regs: SolicitudVista[]): void {
    const pendiente  = regs.filter(s => s.estado === 'pendiente').length;
    const en_proceso = regs.filter(s => s.estado === 'en_proceso').length;
    const resuelta   = regs.filter(s => s.estado === 'resuelta').length;
    this.distribucionData.set({
      labels: ['Pendiente', 'En proceso', 'Resuelta'],
      datasets: [{
        data: [pendiente, en_proceso, resuelta],
        backgroundColor: ['#f59e0b', '#3b5cff', '#10b981'],
        borderWidth: 2,
        borderColor: '#ffffff',
      }],
    });
  }

  private computeTiempoResolucion(regs: SolicitudVista[]): void {
    // Solo solicitudes resueltas con ambas fechas
    const resueltas = regs.filter(s =>
      s.estado === 'resuelta' && s.fecha_resolucion && s.fecha_solicitud
    );

    const map = new Map<string, { total: number; count: number }>();
    resueltas.forEach(s => {
      const inicio  = new Date(s.fecha_solicitud);
      const fin     = new Date(s.fecha_resolucion!);
      const dias    = Math.max(0, (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      const key     = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}`;
      const cur     = map.get(key) ?? { total: 0, count: 0 };
      cur.total += dias;
      cur.count += 1;
      map.set(key, cur);
    });

    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    this.tiempoResData.set({
      labels: sorted.map(([k]) => k),
      datasets: [{
        label: 'Días promedio',
        data: sorted.map(([, v]) => parseFloat((v.total / v.count).toFixed(1))),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#10b981',
      }],
    });
  }
}