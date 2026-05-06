// src/app/pages/admin-panel/novedades/novedades.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { environment } from '../../../../environments/environment';

/**
 * Modelo de novedad devuelto por el backend.
 * GET /novedades/ → NovedadAdmin[]
 */
export interface NovedadAdmin {
  id_novedad:       number;
  id_registro:      number;
  descripcion:      string;
  fecha_novedad:    string;   // ISO datetime
  // Campos enriquecidos que el backend puede devolver en el listado
  aula_codigo?:     string;
  aula_nombre?:     string;
  piso?:            number;
  id_edificio?:     number;
  nombre_edificio?: string;
  auxiliar_nombre?: string;
}

/**
 * /admin/novedades
 *
 * RF: visualizar todas las novedades reportadas por auxiliares.
 * Muestra: aula, descripción, fecha/hora, auxiliar que reportó.
 * Filtros: edificio, piso, aula (texto) y rango de fechas.
 * Gráficas: meses con más novedades, aulas frecuentes, distribución
 * por edificio/piso. Filtrables por rango de fechas y edificio.
 *
 * Las novedades son informativas — no tienen seguimiento de estado.
 */
@Component({
  selector: 'app-admin-novedades',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: 'novedades.html',
  styleUrls: ['novedades.css'],
})
export class AdminNovedadesComponent implements OnInit {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Estado principal ───────────────────────────────────────────
  novedades   = signal<NovedadAdmin[]>([]);
  edificios   = signal<{ id_edificio: number; nombre: string; cantidad_pisos: number }[]>([]);
  loading     = signal(true);
  errorMsg    = signal('');

  // ── Filtros ────────────────────────────────────────────────────
  filtroEdificio = signal<string>('');
  filtroPiso     = signal<string>('');
  filtroAula     = signal<string>('');
  filtroDesde    = signal<string>(this.defaultDesde());
  filtroHasta    = signal<string>(this.defaultHasta());

  // ── Paginación ─────────────────────────────────────────────────
  pageSize  = 10;
  pageIndex = signal(0);

  // ── Vista detalle de novedad ───────────────────────────────────
  novedadDetalle = signal<NovedadAdmin | null>(null);

  // ── Filtrado reactivo ──────────────────────────────────────────
  readonly filteredAll = computed(() => {
    const edif  = this.filtroEdificio().trim();
    const piso  = this.filtroPiso().trim();
    const aula  = this.filtroAula().trim().toLowerCase();
    const desde = this.filtroDesde() ? new Date(this.filtroDesde()) : null;
    const hasta = this.filtroHasta() ? new Date(this.filtroHasta() + 'T23:59:59') : null;

    return this.novedades().filter(n => {
      if (edif && String(n.id_edificio ?? '') !== edif) return false;
      if (piso && String(n.piso ?? '') !== piso) return false;
      if (aula) {
        const haystack = `${n.aula_codigo ?? ''} ${n.aula_nombre ?? ''}`.toLowerCase();
        if (!haystack.includes(aula)) return false;
      }
      if (desde || hasta) {
        const fn = new Date(n.fecha_novedad);
        if (desde && fn < desde) return false;
        if (hasta && fn > hasta) return false;
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

  // ── Pisos disponibles según edificio seleccionado ──────────────
  readonly pisosDisponibles = computed(() => {
    const edifId = Number(this.filtroEdificio());
    if (!edifId) return [];
    const edif = this.edificios().find(e => e.id_edificio === edifId);
    if (!edif) return [];
    return Array.from({ length: edif.cantidad_pisos }, (_, i) => i + 1);
  });

  // ── Gráficas ───────────────────────────────────────────────────
  // Rango de fechas independiente para gráficas
  grafDesde = signal<string>(this.defaultDesde());
  grafHasta = signal<string>(this.defaultHasta());
  grafEdificio = signal<string>('');
  loadingStats = signal(false);

  // Chart 1: Novedades por mes
  mesMasNovedadesData  = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  mesMasNovedadesOpts: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    plugins: { legend: { display: false } },
  };

  // Chart 2: Aulas con más novedades
  aulasFrecuentesData  = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  aulasFrecuentesOpts: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
    plugins: { legend: { display: false } },
  };

  // Chart 3: Distribución por edificio
  porEdificioData  = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });
  porEdificioOpts: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  // ══════════════════════════════════════════════════════════════
  ngOnInit(): void {
    this.cargarEdificios();
    this.cargarNovedades();
  }

  // ── Carga de datos ─────────────────────────────────────────────
  cargarEdificios(): void {
    this.http.get<any[]>(`${this.base}/edificios/`).subscribe({
      next: (data) => this.edificios.set(data ?? []),
      error: () => {},
    });
  }

  cargarNovedades(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    this.http.get<NovedadAdmin[]>(`${this.base}/novedades/`).subscribe({
      next: (data) => {
        this.novedades.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
        this.recomputeCharts();
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.detail || 'No se pudieron cargar las novedades.');
        this.loading.set(false);
      },
    });
  }

  // ── Filtros ────────────────────────────────────────────────────
  setFiltroEdificio(v: string): void {
    this.filtroEdificio.set(v);
    this.filtroPiso.set('');   // reset piso al cambiar edificio
    this.pageIndex.set(0);
  }

  setFiltroPiso(v: string): void { this.filtroPiso.set(v); this.pageIndex.set(0); }
  setFiltroAula(v: string): void { this.filtroAula.set(v); this.pageIndex.set(0); }
  setFiltroDesde(v: string): void { this.filtroDesde.set(v); this.pageIndex.set(0); }
  setFiltroHasta(v: string): void { this.filtroHasta.set(v); this.pageIndex.set(0); }

  limpiarFiltros(): void {
    this.filtroEdificio.set('');
    this.filtroPiso.set('');
    this.filtroAula.set('');
    this.filtroDesde.set(this.defaultDesde());
    this.filtroHasta.set(this.defaultHasta());
    this.pageIndex.set(0);
  }

  // ── Paginación ─────────────────────────────────────────────────
  pagePrev(): void { if (this.pageIndex() > 0) this.pageIndex.update(i => i - 1); }
  pageNext(): void { if (this.pageIndex() < this.totalPages() - 1) this.pageIndex.update(i => i + 1); }

  // ── Detalle de novedad ─────────────────────────────────────────
  verDetalle(n: NovedadAdmin): void { this.novedadDetalle.set(n); }
  cerrarDetalle(): void { this.novedadDetalle.set(null); }

  // ── Formato ────────────────────────────────────────────────────
  formatFecha(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatHora(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  nombreEdificio(id: number | undefined): string {
    if (!id) return '—';
    return this.edificios().find(e => e.id_edificio === id)?.nombre ?? `Edif. ${id}`;
  }

  // ── Gráficas ───────────────────────────────────────────────────
  setGrafDesde(v: string): void { this.grafDesde.set(v); this.recomputeCharts(); }
  setGrafHasta(v: string): void { this.grafHasta.set(v); this.recomputeCharts(); }
  setGrafEdificio(v: string): void { this.grafEdificio.set(v); this.recomputeCharts(); }

  private recomputeCharts(): void {
    const desde     = this.grafDesde()    ? new Date(this.grafDesde())                 : null;
    const hasta     = this.grafHasta()    ? new Date(this.grafHasta() + 'T23:59:59')  : null;
    const edifFiltro = this.grafEdificio();

    let filtered = this.novedades().filter(n => {
      const fn = new Date(n.fecha_novedad);
      if (desde && fn < desde) return false;
      if (hasta && fn > hasta) return false;
      if (edifFiltro && String(n.id_edificio ?? '') !== edifFiltro) return false;
      return true;
    });

    this.computeMesMasNovedades(filtered);
    this.computeAulasFrecuentes(filtered);
    this.computePorEdificio(filtered);
  }

  private computeMesMasNovedades(novedades: NovedadAdmin[]): void {
    const map = new Map<string, number>();
    novedades.forEach(n => {
      const d = new Date(n.fecha_novedad);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    this.mesMasNovedadesData.set({
      labels: sorted.map(([k]) => k),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: '#3b5cff',
        borderRadius: 6,
      }],
    });
  }

  private computeAulasFrecuentes(novedades: NovedadAdmin[]): void {
    const map = new Map<string, number>();
    novedades.forEach(n => {
      const key = n.aula_codigo ?? `Reg#${n.id_registro}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    const top = Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    this.aulasFrecuentesData.set({
      labels: top.map(([k]) => k),
      datasets: [{
        data: top.map(([, v]) => v),
        backgroundColor: top.map((_, i) =>
          ['#3b5cff','#6179ff','#8a9cff','#f59e0b','#ef4444','#10b981','#6366f1','#ec4899'][i % 8]
        ),
        borderRadius: 4,
        barThickness: 20,
      }],
    });
  }

  private computePorEdificio(novedades: NovedadAdmin[]): void {
    const map = new Map<string, number>();
    novedades.forEach(n => {
      const key = n.nombre_edificio ?? this.nombreEdificio(n.id_edificio);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    const entries = Array.from(map.entries());

    const COLORS = ['#3b5cff','#f59e0b','#10b981','#ef4444','#6366f1','#ec4899','#06b6d4'];
    this.porEdificioData.set({
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map((_, i) => COLORS[i % COLORS.length]),
        borderWidth: 2,
        borderColor: '#fff',
      }],
    });
  }

  // ── Helpers de rango por defecto ───────────────────────────────
  private defaultDesde(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  }
  private defaultHasta(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** ¿Hay datos en el rango de gráficas? */
  hasStatsData(): boolean { return this.novedades().length > 0; }
}