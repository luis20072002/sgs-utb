// src/app/pages/admin-panel/docentes/docentes.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog';
import {
  DocentesService, Docente, DocenteCreatePayload
} from '../../../services/docentes.service';
import { environment } from '../../../../environments/environment';

interface RegistroLite {
  id_docente: number;
  asistencia_docente: boolean;
  fecha_registro: string;
}

/**
 * /admin/docentes
 *
 * RF: el sistema debe permitir al administrador crear, visualizar,
 * actualizar y desactivar docentes. La desactivación debe ser lógica.
 *
 * Sección de gráficas (filtrables por rango de fechas):
 *  - Docentes con menor índice de asistencia
 *  - Días de la semana con mayor ausentismo
 *  - Evolución de asistencia por mes
 *
 * Las stats se computan en cliente desde GET /registros/.
 * Cuando exista un endpoint /docentes/stats, se reemplaza.
 */
@Component({
  selector: 'app-admin-docentes',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, ConfirmDialogComponent, BaseChartDirective
  ],
  templateUrl: 'docentes.html',
  styleUrls: ['docentes.css'],
})
export class AdminDocentesComponent implements OnInit {
  private fb  = inject(FormBuilder);
  private svc = inject(DocentesService);
  private http = inject(HttpClient);

  // ── Estado ────────────────────────────────────────────────────
  docentes  = signal<Docente[]>([]);
  loading   = signal(true);
  errorMsg  = signal('');

  // Filtros
  searchTerm    = signal('');
  filtroEstado  = signal<'todos' | 'activos' | 'inactivos'>('todos');

  // Paginación
  pageSize  = 10;
  pageIndex = signal(0);

  readonly filteredAll = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const f    = this.filtroEstado();
    return this.docentes().filter(d => {
      if (f === 'activos'   && !d.estado) return false;
      if (f === 'inactivos' &&  d.estado) return false;
      if (term) {
        const haystack = `${d.nombre} ${d.apellido} ${d.correo}`.toLowerCase();
        if (!haystack.includes(term)) return false;
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

  // ── Modal CRUD ────────────────────────────────────────────────
  showFormModal = signal(false);
  editing       = signal<Docente | null>(null);
  saving        = signal(false);
  saveError     = signal('');

  form: FormGroup = this.fb.group({
    nombre:   ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    correo:   ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[+\d\s\-()]{7,20}$/)]],
  });

  // ── Toggle estado ─────────────────────────────────────────────
  showToggleDialog = signal(false);
  toggleTarget     = signal<Docente | null>(null);
  toggling         = signal(false);
  toggleError      = signal('');

  // ── Gráficas (datos derivados) ────────────────────────────────
  registros        = signal<RegistroLite[]>([]);
  loadingStats     = signal(false);
  rangeStart       = signal<string>(this.defaultRangeStart());
  rangeEnd         = signal<string>(this.defaultRangeEnd());

  // Chart: Top 5 con menor asistencia
  bottomAsistenciaData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  bottomAsistenciaOpts: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } }
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => (ctx.parsed.x ?? 0).toFixed(1) + '% asistencia' } }
    }
  };

  // Chart: Ausentismo por día de la semana
  ausentismoSemanaData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  ausentismoSemanaOpts: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    plugins: { legend: { display: false } }
  };

  // Chart: Evolución mensual
  evolucionMesData = signal<ChartData<'line'>>({ labels: [], datasets: [] });
  evolucionMesOpts: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
    plugins: { legend: { display: false } }
  };

  ngOnInit(): void {
    this.cargarDocentes();
    this.cargarRegistros();
  }

  // ═════════════════════════════════════════════════════════════
  //  Carga
  // ═════════════════════════════════════════════════════════════
  cargarDocentes(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.svc.list().subscribe({
      next: (data) => {
        this.docentes.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.detail || 'No se pudieron cargar los docentes');
        this.loading.set(false);
      }
    });
  }

  cargarRegistros(): void {
    this.loadingStats.set(true);
    // Usamos GET /registros/ y computamos stats en cliente.
    // Cuando exista GET /docentes/stats?desde=&hasta=, reemplazar.
    this.http.get<RegistroLite[]>(`${environment.apiUrl}/registros/`).subscribe({
      next: (data) => {
        this.registros.set(Array.isArray(data) ? data : []);
        this.recomputeCharts();
        this.loadingStats.set(false);
      },
      error: () => {
        // No bloqueamos la pantalla si falla — solo no mostramos gráficas
        this.registros.set([]);
        this.loadingStats.set(false);
      }
    });
  }

  // ═════════════════════════════════════════════════════════════
  //  Formato helpers
  // ═════════════════════════════════════════════════════════════
  initials(d: Docente): string {
    return ((d.nombre[0] ?? '') + (d.apellido[0] ?? '')).toUpperCase();
  }

  fullName(d: Docente): string {
    return `${d.nombre} ${d.apellido}`;
  }

  // ═════════════════════════════════════════════════════════════
  //  Filtros y paginación
  // ═════════════════════════════════════════════════════════════
  setFiltroEstado(value: 'todos' | 'activos' | 'inactivos'): void {
    this.filtroEstado.set(value);
    this.pageIndex.set(0);
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
  }

  pagePrev(): void {
    if (this.pageIndex() > 0) this.pageIndex.update(i => i - 1);
  }
  pageNext(): void {
    if (this.pageIndex() < this.totalPages() - 1) this.pageIndex.update(i => i + 1);
  }

  // ═════════════════════════════════════════════════════════════
  //  Modal CRUD
  // ═════════════════════════════════════════════════════════════
  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ nombre: '', apellido: '', correo: '', telefono: '' });
    this.saveError.set('');
    this.showFormModal.set(true);
  }

  openEdit(d: Docente): void {
    this.editing.set(d);
    this.form.reset({
      nombre: d.nombre, apellido: d.apellido,
      correo: d.correo, telefono: d.telefono,
    });
    this.saveError.set('');
    this.showFormModal.set(true);
  }

  closeForm(): void {
    if (this.saving()) return;
    this.showFormModal.set(false);
  }

  fieldHasError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saveError.set('');

    const raw = this.form.value;
    const payload: DocenteCreatePayload = {
      nombre:   raw.nombre.trim(),
      apellido: raw.apellido.trim(),
      correo:   raw.correo.trim().toLowerCase(),
      telefono: raw.telefono.trim(),
    };

    const editing = this.editing();
    const obs = editing
      ? this.svc.update(editing.id_docente, payload)
      : this.svc.create(payload);

    obs.subscribe({
      next: (d) => {
        if (editing) {
          this.docentes.update(list =>
            list.map(x => x.id_docente === d.id_docente ? d : x)
          );
        } else {
          this.docentes.update(list => [...list, d]);
        }
        this.saving.set(false);
        this.showFormModal.set(false);
      },
      error: (err) => {
        this.saveError.set(err?.error?.detail || 'No se pudo guardar el docente');
        this.saving.set(false);
      }
    });
  }

  // ═════════════════════════════════════════════════════════════
  //  Activar / Desactivar
  // ═════════════════════════════════════════════════════════════
  requestToggle(d: Docente): void {
    this.toggleTarget.set(d);
    this.toggleError.set('');
    this.showToggleDialog.set(true);
  }

  cancelToggle(): void {
    if (this.toggling()) return;
    this.showToggleDialog.set(false);
  }

  confirmToggle(): void {
      const d = this.toggleTarget();
      if (!d) return;
      this.toggling.set(true);

      // Handler unificado para ambas ramas (activar / desactivar).
      // Lo separamos así porque TS no puede unificar Observable<Docente>
      // con Observable<{detail: string}> en un mismo subscribe.
      const onSuccess = () => {
        this.docentes.update(list =>
          list.map(x => x.id_docente === d.id_docente ? { ...x, estado: !d.estado } : x)
        );
        this.toggling.set(false);
        this.showToggleDialog.set(false);
      };
      const onError = (err: any) => {
        this.toggleError.set(err?.error?.detail || 'No se pudo actualizar el estado');
        this.toggling.set(false);
      };

      if (d.estado) {
        this.svc.desactivar(d.id_docente).subscribe({ next: onSuccess, error: onError });
      } else {
        this.svc.activar(d.id_docente).subscribe({ next: onSuccess, error: onError });
      }
    }

  // ═════════════════════════════════════════════════════════════
  //  Gráficas
  // ═════════════════════════════════════════════════════════════
  setRangeStart(v: string): void { this.rangeStart.set(v); this.recomputeCharts(); }
  setRangeEnd(v: string): void   { this.rangeEnd.set(v);   this.recomputeCharts(); }

  private defaultRangeStart(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  }
  private defaultRangeEnd(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private recomputeCharts(): void {
    const start = new Date(this.rangeStart());
    const end   = new Date(this.rangeEnd());
    end.setHours(23, 59, 59);

    const regsEnRango = this.registros().filter(r => {
      if (!r.fecha_registro) return false;
      const d = new Date(r.fecha_registro);
      return d >= start && d <= end;
    });

    this.computeBottomAsistencia(regsEnRango);
    this.computeAusentismoSemana(regsEnRango);
    this.computeEvolucionMes(regsEnRango);
  }

  private computeBottomAsistencia(regs: RegistroLite[]): void {
    const map = new Map<number, { total: number; asistio: number }>();
    regs.forEach(r => {
      const cur = map.get(r.id_docente) ?? { total: 0, asistio: 0 };
      cur.total += 1;
      if (r.asistencia_docente) cur.asistio += 1;
      map.set(r.id_docente, cur);
    });

    const rows = Array.from(map.entries())
      .filter(([, v]) => v.total >= 3) // mínimo 3 registros para ser estadísticamente útil
      .map(([id, v]) => {
        const docente = this.docentes().find(d => d.id_docente === id);
        return {
          nombre: docente ? `${docente.nombre} ${docente.apellido[0]}.` : `#${id}`,
          pct: (v.asistio / v.total) * 100,
        };
      })
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);

    this.bottomAsistenciaData.set({
      labels: rows.map(r => r.nombre),
      datasets: [{
        data: rows.map(r => r.pct),
        backgroundColor: rows.map(r =>
          r.pct < 50 ? '#dc2626' : r.pct < 75 ? '#f59e0b' : '#10b981'
        ),
        borderRadius: 6,
        barThickness: 22,
      }]
    });
  }

  private computeAusentismoSemana(regs: RegistroLite[]): void {
    const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const ausentismo = [0, 0, 0, 0, 0, 0, 0];
    regs.forEach(r => {
      if (!r.asistencia_docente) {
        const d = new Date(r.fecha_registro);
        ausentismo[d.getDay()] += 1;
      }
    });

    this.ausentismoSemanaData.set({
      labels: labels.slice(1).concat([labels[0], labels[6]]).slice(0, 6), // Lun-Sáb
      datasets: [{
        data: [ausentismo[1], ausentismo[2], ausentismo[3], ausentismo[4], ausentismo[5], ausentismo[6]],
        backgroundColor: '#3b5cff',
        borderRadius: 6,
      }]
    });
  }

  private computeEvolucionMes(regs: RegistroLite[]): void {
    const map = new Map<string, { total: number; asistio: number }>();
    regs.forEach(r => {
      const d = new Date(r.fecha_registro);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cur = map.get(key) ?? { total: 0, asistio: 0 };
      cur.total += 1;
      if (r.asistencia_docente) cur.asistio += 1;
      map.set(key, cur);
    });

    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));

    this.evolucionMesData.set({
      labels: sorted.map(([k]) => k),
      datasets: [{
        label: 'Asistencia %',
        data: sorted.map(([, v]) => (v.asistio / v.total) * 100),
        borderColor: '#3b5cff',
        backgroundColor: 'rgba(59, 92, 255, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#3b5cff',
      }]
    });
  }

  /**
   * Indica si hay datos de registros suficientes para mostrar gráficas.
   * Si la API de registros aún no responde con datos, mostramos un empty state
   * en la sección de analytics en lugar de gráficas vacías.
   */
  hasStatsData(): boolean {
    return this.registros().length > 0;
  }
}
