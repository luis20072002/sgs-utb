import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { HeaderComponent } from '../../components/header/header';
import { KpiCardsComponent } from '../../components/kpi-cards/kpi-cards';
import { ActivityFeedComponent } from '../../components/activity-feed/activity-feed';
import { ChartsComponent } from '../../components/charts/charts';
import { UsersComponent } from './users/users';
import { ReportsComponent } from './reports/reports';
import { TeachersComponent } from './teachers/teachers';
import { DocenteRow } from './teachers/teachers';
import { User, KPIStats, ActivityLog } from '../../../models/edu.models';
import { AuthService } from '../../services/auth';
import { ReportService, Report } from '../../services/report';
 
// Usuarios reales de la app (mismos que users.ts)
const APP_USERS = [
  { id: '1', name: 'Ana Martínez',   email: 'ana@sgs.com',     role: 'administrador' },
  { id: '2', name: 'Juan Pérez',     email: 'juan@sgs.com',    role: 'auxiliar'      },
  { id: '3', name: 'Roberto Gómez',  email: 'roberto@sgs.com', role: 'auxiliar'      },
  { id: '4', name: 'María López',    email: 'maria@sgs.com',   role: 'docente'       },
  { id: '5', name: 'Carlos Herrera', email: 'carlos@sgs.com',  role: 'docente'       },
];
 
@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet,
    SidebarComponent, HeaderComponent,
    KpiCardsComponent, ActivityFeedComponent, ChartsComponent,
    UsersComponent, ReportsComponent, TeachersComponent
  ],
  templateUrl: 'admin-panel.html',
  styleUrls: ['admin-panel.css']
})
export class AdminPanelComponent implements OnInit {
  isLoading  = true;
  activeTab  = 'dashboard';
  showCharts = false;
 
  /** Docentes creados desde UsersComponent que se pasan a TeachersComponent */
  newDocentes: DocenteRow[] = [];
 
  constructor(
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private reportService: ReportService,
    private router: Router
  ) {}
 
  ngOnInit(): void {
    setTimeout(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    }, 800);
  }
 
  readonly mockUser: User = {
    id: 'adm_001',
    name: 'Admin EduControl',
    email: 'admin@educontrol.com',
    role: 'administrador',
    avatar: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?q=80&w=400&h=400&auto=format&fit=crop'
  };
 
  get mockStats(): KPIStats {
    const reports = this.reportService.getReports();
    return {
      totalUsers:                  APP_USERS.length,
      totalDocentes:               APP_USERS.filter(u => u.role === 'docente').length,
      totalAuxiliares:             APP_USERS.filter(u => u.role === 'auxiliar').length,
      totalReports:                reports.length,
      totalProyectoresFallando:    reports.filter(r => !r.proyectorFunciona).length,
      totalProfesoresNoAsistieron: reports.filter(r => !r.profesorAsistio).length,
    };
  }
 
  get mockLogs(): ActivityLog[] {
    const reports = this.reportService.getReports();
 
    const reportLogs: ActivityLog[] = reports.map((r: Report) => ({
      id: r.id,
      user: r.auxiliarName,
      action: `envió un reporte del Aula ${r.aula} — ${r.materia}`,
      timestamp: `${r.fecha} ${r.hora}`,
      type: 'create' as const
    }));
 
    const staticLogs: ActivityLog[] = [
      { id: 'static_1', user: 'Ana Martínez',  action: 'creó un nuevo curso: Cálculo I',         timestamp: 'Hace 5 min',  type: 'create' },
      { id: 'static_2', user: 'Juan Pérez',    action: 'actualizó el horario del Aula 302',       timestamp: 'Hace 12 min', type: 'update' },
      { id: 'static_3', user: 'Roberto Gómez', action: 'fue asignado al Turno Noche',             timestamp: 'Hace 45 min', type: 'assign' },
      { id: 'static_4', user: 'Admin',         action: 'eliminó un registro de planilla antiguo', timestamp: 'Hace 2h',     type: 'delete' },
    ];
 
    return [...reportLogs, ...staticLogs];
  }
 
  get currentDateTime(): string {
    const d = new Date();
    return `${d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  }
 
  /** Recibe un docente recién creado desde UsersComponent */
  onDocenteCreado(docente: DocenteRow): void {
    this.newDocentes = [...this.newDocentes, docente];
  }
 
  get welcomeTitle(): string {
    const titles: Record<string, string> = {
      dashboard: 'Panel de Administrador',
      charts:    'Panel de Administrador',
      users:     'Gestión de Usuarios',
      teachers:  'Gestión de Docentes',
      reports:   'Reportes de Auxiliares',
    };
    return titles[this.activeTab] ?? 'Panel de Administrador';
  }
 
  onTabChange(tab: string): void {
    this.activeTab = tab;
    this.showCharts = false;
  }
 
  onKpiClick(): void {
    this.showCharts = true;
    this.activeTab = 'charts';
  }
 
  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}