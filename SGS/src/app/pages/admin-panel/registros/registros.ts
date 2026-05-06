// src/app/pages/admin-panel/registros/registros.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { environment } from '../../../../environments/environment';

/**
 * Modelo de registro devuelto por GET /registros/
 * Los campos con ? son enriquecimientos que el backend puede incluir.
 */
export interface RegistroAdmin {
  id_registro:              number;
  id_aula:                  number;
  id_docente:               number;
  id_planilla?:             number;
  id_turno?:                number;
  asistencia_docente:       boolean;
  uso_audiovisual:          boolean;
  fecha_registro:           string;   // ISO datetime
  hora_inicio?:             string;
  hora_fin?:                string;
  // Campos enriquecidos
  aula_codigo?:             string;
  aula_nombre?:             string;
  piso?:                    number;
  id_edificio?:             number;
  nombre_edificio?:         string;
  docente_nombre?:          string;
  docente_apellido?:        string;
  nombre_turno?:            string;
  curso_nombre?:            string;
  auxiliar_nombre?:         string;
}

/**
 * /admin/registros
 *
 * RF: visualizar todos los registros de aula generados por los auxiliares.
 * Muestra: aula, docente, curso, turno, asistencia docente, uso de
 * medios audiovisuales, fecha y hora.
 * Filtros: edificio, piso, aula (texto), docente (texto), turno y rango de fechas.
 *
 * Gráficas:
 *  - Total de registros por día / mes / año
 *  - Porcentaje de asistencia docente por período
 *  - Uso de medios audiovisuales por edificio y turno
 *  - Aulas con mayor índice de ausentismo docente
 *
 * Filtrables por rango de fechas, edificio y turno.
 */
@Component({
  selector: 'app-admin-registros',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: 'registros.html',
  styleUrls: ['registros.css'],
})
export class AdminRegistrosComponent implements OnInit {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Estado principal ───────────────────────────────────────────
  registros  = signal<RegistroAdmin[]>([]);
  edificios  = signal<{ id_edificio: number; nombre: string; cantidad_pisos: number }[]>([]);
  turnos     = signal<{ id_turno: number; nombre_turno: string }[]>([]);
  loading    = signal(true);
  errorMsg   = signal('');

  // ── Filtros ────────────────────────────────────────────────────
  filtroEdificio = signal<string>('');
  filtroPiso     = signal<string>('');
  filtroAula     = signal<string>('');
  filtroDocente  = signal<string>('');
  filtroTurno    = signal<string>('');
  filtroDesde    = signal<string>(this.defaultDesde());
  filtroHasta    = signal<string>(this.defaultHasta());

  // ── Paginación ─────────────────────────────────────────────────
  pageSize  = 10;
  pageIndex = signal(0);

  // ── Vista detalle ──────────────────────────────────────────────
  registroDetalle = signal<RegistroAdmin | null>(null);

  // ── Filtrado reactivo ──────────────────────────────────────────
  readonly filteredAll = computed(() => {
    const edif    = this.filtroEdificio().trim();
    const piso    = this.filtroPiso().trim();
    const aula    = this.filtroAula().trim().toLowerCase();
    const docente = this.filtroDocente().trim().toLowerCase();
    const turno   = this.filtroTurno().trim();
    const desde   = this.filtroDesde() ? new Date(this.filtroDesde()) : null;
    const hasta   = this.filtroHasta() ? new Date(this.filtroHasta() + 'T23:59:59') : null;

    return this.registros().filter(r => {
      if (edif  && String(r.id_edificio ?? '') !== edif)   return false;
      if (piso  && String(r.piso ?? '') !== piso)           return false;
      if (turno && String(r.id_turno ?? '') !== turno)      return false;
      if (aula) {
        const h = `${r.aula_codigo ?? ''} ${r.aula_nombre ?? ''}`.toLowerCase();
        if (!h.includes(aula)) return false;
      }
      if (docente) {
        const h = `${r.docente_nombre ?? ''} ${r.docente_apellido ?? ''}`.toLowerCase();
        if (!h.includes(docente)) return false;
      }
      if (desde || hasta) {
        const fr = new Date(r.fecha_registro);
        if (desde && fr < desde) return false;
        if (hasta && fr > hasta) return false;
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

  readonly pisosDisponibles = computed(() => {
    const edifId = Number(this.filtroEdificio());
    if (!edifId) return [];
    const edif = this.edificios().find(e => e.id_edificio === edifId);
    if (!edif) return [];
    return Array.from({ length: edif.cantidad_pisos }, (_, i) => i + 1);
  });

  // ── KPIs rápidos del filtro activo ─────────────────────────────
  readonly kpiTotal = computed(() => this.filteredAll().length);
  readonly kpiAsistencia = computed(() => {
    const all = this.filteredAll();
    if (!all.length) return 0;
    return Math.round((all.filter(r => r.asistencia_docente).length / all.length) * 100);
  });
  readonly kpiAudiovisual = computed(() => {
    const all = this.filteredAll();
    if (!all.length) return 0;
    return Math.round((all.filter(r => r.uso_audiovisual).length / all.length) * 100);
  });

  // ── Gráficas ───────────────────────────────────────────────────
  granularidad  = signal<'dia' | 'mes' | 'anio'>('mes');
  grafDesde     = signal<string>(this.defaultDesde());
  grafHasta     = signal<string>(this.defaultHasta());
  grafEdificio  = signal<string>('');
  grafTurno     = signal<string>('');

  // Chart 1: Registros por período
  registrosPorPeriodoData  = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  registrosPorPeriodoOpts: ChartConfiguration<'bar'>['options'] = {
    responsive: true, maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    plugins: { legend: { display: false } },
  };

  // Chart 2: Asistencia docente por período (line)
  asistenciaPorPeriodoData  = signal<ChartData<'line'>>({ labels: [], datasets: [] });
  asistenciaPorPeriodoOpts: ChartConfiguration<'line'>['options'] = {
    responsive: true, maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
    plugins: { legend: { display: false } },
  };

  // Chart 3: Uso audiovisual por edificio
  audiovisualEdificioData  = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  audiovisualEdificioOpts: ChartConfiguration<'bar'>['options'] = {
    responsive: true, maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
    plugins: { legend: { display: false } },
  };

  // Chart 4: Aulas con mayor ausentismo docente
  ausentismoAulasData  = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  ausentismoAulasOpts: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true, maintainAspectRatio: false,
    scales: { x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
    plugins: { legend: { display: false } },
  };

  // ══════════════════════════════════════════════════════════════
  ngOnInit(): void {
    this.cargarAuxiliares();
    this.cargarRegistros();
  }

  private cargarAuxiliares(): void {
    this.http.get<any[]>(`${this.base}/edificios/`).subscribe({
      next: d => this.edificios.set(d ?? []),
      error: () => {},
    });
    this.http.get<any[]>(`${this.base}/turnos/`).subscribe({
      next: d => this.turnos.set(d ?? []),
      error: () => {},
    });
  }

  cargarRegistros(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.http.get<RegistroAdmin[]>(`${this.base}/registros/`).subscribe({
      next: (data) => {
        this.registros.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
        this.recomputeCharts();
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.detail || 'No se pudieron cargar los registros.');
        this.loading.set(false);
      },
    });
  }

  // ── Filtros ────────────────────────────────────────────────────
  setFiltroEdificio(v: string): void {
    this.filtroEdificio.set(v);
    this.filtroPiso.set('');
    this.pageIndex.set(0);
  }
  setFiltroPiso(v: string): void     { this.filtroPiso.set(v); this.pageIndex.set(0); }
  setFiltroAula(v: string): void     { this.filtroAula.set(v); this.pageIndex.set(0); }
  setFiltroDocente(v: string): void  { this.filtroDocente.set(v); this.pageIndex.set(0); }
  setFiltroTurno(v: string): void    { this.filtroTurno.set(v); this.pageIndex.set(0); }
  setFiltroDesde(v: string): void    { this.filtroDesde.set(v); this.pageIndex.set(0); }
  setFiltroHasta(v: string): void    { this.filtroHasta.set(v); this.pageIndex.set(0); }

  limpiarFiltros(): void {
    this.filtroEdificio.set('');
    this.filtroPiso.set('');
    this.filtroAula.set('');
    this.filtroDocente.set('');
    this.filtroTurno.set('');
    this.filtroDesde.set(this.defaultDesde());
    this.filtroHasta.set(this.defaultHasta());
    this.pageIndex.set(0);
  }

  // ── Paginación ─────────────────────────────────────────────────
  pagePrev(): void { if (this.pageIndex() > 0) this.pageIndex.update(i => i - 1); }
  pageNext(): void { if (this.pageIndex() < this.totalPages() - 1) this.pageIndex.update(i => i + 1); }

  // ── Detalle ────────────────────────────────────────────────────
  verDetalle(r: RegistroAdmin): void { this.registroDetalle.set(r); }
  cerrarDetalle(): void { this.registroDetalle.set(null); }

  // ── Formato ────────────────────────────────────────────────────
  formatFecha(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  formatHora(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
  nombreDocente(r: RegistroAdmin): string {
    const n = r.docente_nombre ?? '';
    const a = r.docente_apellido ?? '';
    return (n + ' ' + a).trim() || `#${r.id_docente}`;
  }
  nombreEdificio(id: number | undefined): string {
    if (!id) return '—';
    return this.edificios().find(e => e.id_edificio === id)?.nombre ?? `Edif. ${id}`;
  }
  nombreTurno(id: number | undefined): string {
    if (!id) return '—';
    return this.turnos().find(t => t.id_turno === id)?.nombre_turno ?? `Turno ${id}`;
  }

  // ── Gráficas ───────────────────────────────────────────────────
  setGranularidad(v: 'dia' | 'mes' | 'anio'): void { this.granularidad.set(v); this.recomputeCharts(); }
  setGrafDesde(v: string): void    { this.grafDesde.set(v);    this.recomputeCharts(); }
  setGrafHasta(v: string): void    { this.grafHasta.set(v);    this.recomputeCharts(); }
  setGrafEdificio(v: string): void { this.grafEdificio.set(v); this.recomputeCharts(); }
  setGrafTurno(v: string): void    { this.grafTurno.set(v);    this.recomputeCharts(); }

  private recomputeCharts(): void {
    const desde  = this.grafDesde()   ? new Date(this.grafDesde())                : null;
    const hasta  = this.grafHasta()   ? new Date(this.grafHasta() + 'T23:59:59') : null;
    const edif   = this.grafEdificio();
    const turno  = this.grafTurno();

    const base = this.registros().filter(r => {
      const fr = new Date(r.fecha_registro);
      if (desde && fr < desde) return false;
      if (hasta && fr > hasta) return false;
      if (edif  && String(r.id_edificio ?? '') !== edif)  return false;
      if (turno && String(r.id_turno ?? '') !== turno)     return false;
      return true;
    });

    this.computeRegistrosPorPeriodo(base);
    this.computeAsistenciaPorPeriodo(base);
    this.computeAudiovisualEdificio(base);
    this.computeAusentismoAulas(base);
  }

  private periodoKey(iso: string): string {
    const d = new Date(iso);
    const g = this.granularidad();
    if (g === 'dia')  return d.toISOString().slice(0, 10);
    if (g === 'anio') return String(d.getFullYear());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private computeRegistrosPorPeriodo(regs: RegistroAdmin[]): void {
    const map = new Map<string, number>();
    regs.forEach(r => {
      const k = this.periodoKey(r.fecha_registro);
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    this.registrosPorPeriodoData.set({
      labels: sorted.map(([k]) => k),
      datasets: [{ data: sorted.map(([, v]) => v), backgroundColor: '#3b5cff', borderRadius: 6 }],
    });
  }

  private computeAsistenciaPorPeriodo(regs: RegistroAdmin[]): void {
    const map = new Map<string, { total: number; asistio: number }>();
    regs.forEach(r => {
      const k = this.periodoKey(r.fecha_registro);
      const cur = map.get(k) ?? { total: 0, asistio: 0 };
      cur.total++;
      if (r.asistencia_docente) cur.asistio++;
      map.set(k, cur);
    });
    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    this.asistenciaPorPeriodoData.set({
      labels: sorted.map(([k]) => k),
      datasets: [{
        label: 'Asistencia %',
        data: sorted.map(([, v]) => (v.asistio / v.total) * 100),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true, tension: 0.35,
        pointRadius: 4, pointBackgroundColor: '#10b981',
      }],
    });
  }

  private computeAudiovisualEdificio(regs: RegistroAdmin[]): void {
    const map = new Map<string, { total: number; uso: number }>();
    regs.forEach(r => {
      const k = r.nombre_edificio ?? this.nombreEdificio(r.id_edificio);
      const cur = map.get(k) ?? { total: 0, uso: 0 };
      cur.total++;
      if (r.uso_audiovisual) cur.uso++;
      map.set(k, cur);
    });
    const entries = Array.from(map.entries()).filter(([, v]) => v.total > 0);
    this.audiovisualEdificioData.set({
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => (v.uso / v.total) * 100),
        backgroundColor: '#6366f1', borderRadius: 6,
      }],
    });
  }

  private computeAusentismoAulas(regs: RegistroAdmin[]): void {
    const map = new Map<string, { total: number; ausente: number }>();
    regs.forEach(r => {
      const k = r.aula_codigo ?? `Aula #${r.id_aula}`;
      const cur = map.get(k) ?? { total: 0, ausente: 0 };
      cur.total++;
      if (!r.asistencia_docente) cur.ausente++;
      map.set(k, cur);
    });
    const top = Array.from(map.entries())
      .filter(([, v]) => v.total >= 3)
      .map(([k, v]) => ({ aula: k, pct: (v.ausente / v.total) * 100 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 8);

    this.ausentismoAulasData.set({
      labels: top.map(r => r.aula),
      datasets: [{
        data: top.map(r => r.pct),
        backgroundColor: top.map(r =>
          r.pct >= 50 ? '#ef4444' : r.pct >= 25 ? '#f59e0b' : '#10b981'
        ),
        borderRadius: 4, barThickness: 20,
      }],
    });
  }

  // ── Helpers de rango ───────────────────────────────────────────
  private defaultDesde(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  }
  private defaultHasta(): string {
    return new Date().toISOString().slice(0, 10);
  }

  hasStatsData(): boolean { return this.registros().length > 0; }
}