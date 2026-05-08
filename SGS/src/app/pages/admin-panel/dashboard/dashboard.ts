// src/app/pages/admin-panel/dashboard/dashboard.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, AdminKpiStats, AlertaSistema } from '../../../services/admin.service';

/**
 * /admin/dashboard
 *
 * Cumple con los siguientes RF del documento:
 *  - Tarjetas KPI: Auxiliares activos, Docentes registrados,
 *    Planillas generadas, Reportes del período.
 *  - Cada KPI navega a su subpantalla (acceso directo).
 *  - Sección de Alertas del sistema (planillas sin completar,
 *    reportes pendientes, etc.).
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: 'dashboard.html',
  styleUrls: ['dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  private adminSvc = inject(AdminService);

  loading  = signal(true);
  stats    = signal<AdminKpiStats>({
    auxiliaresActivos:   0,
    docentesRegistrados: 0,
    planillasGeneradas:  0,
    reportesPeriodo:     0,
  });
  alertas  = signal<AlertaSistema[]>([]);
  errorMsg = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    this.adminSvc.getKpiStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => this.errorMsg.set('No se pudieron cargar los KPIs'),
    });

    this.adminSvc.getAlertasSistema().subscribe({
      next: (a) => {
        this.alertas.set(a);
        this.loading.set(false);
      },
      error: () => {
        this.alertas.set([]);
        this.loading.set(false);
      }
    });
  }

  iconoAlerta(tipo: AlertaSistema['tipo']): string {
    const map: Record<AlertaSistema['tipo'], string> = {
      planilla_incompleta:    'assignment_late',
      solicitud_pendiente:    'pending_actions',
      auxiliar_sin_horario:   'event_busy',
      edificio_sin_planilla:  'apartment',
      novedad_critica:        'priority_high',
    };
    return map[tipo] ?? 'info';
  }

  refrescar(): void {
    this.loadAll();
  }
}
