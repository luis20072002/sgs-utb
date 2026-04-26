import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SidebarComponent }     from '../../components/sidebar/sidebar';
import { HeaderComponent }       from '../../components/header/header';
import { KpiCardsComponent }     from '../../components/kpi-cards/kpi-cards';
import { ActivityFeedComponent } from '../../components/activity-feed/activity-feed';
import { ChartsComponent }       from '../../components/charts/charts';
import { UsersComponent }        from './users/users';
import { ReportsComponent }      from './reports/reports';

import { User, KPIStats, ActivityLog } from '../../../models/edu.models';
import { AuthService }                  from '../../services/auth';
import { ReportService, Report }        from '../../services/report';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent, HeaderComponent,
    KpiCardsComponent, ActivityFeedComponent, ChartsComponent,
    UsersComponent, ReportsComponent
  ],
  templateUrl: 'admin-panel.html',
  styleUrls: ['admin-panel.css']
})
export class AdminPanelComponent implements OnInit {
  isLoading  = true;
  activeTab  = 'dashboard';
  showCharts = false;

  stats: KPIStats = {
    totalUsers:                  0,
    totalDocentes:               0,
    totalAuxiliares:             0,
    totalReports:                0,
    totalProyectoresFallando:    0,
    totalProfesoresNoAsistieron: 0
  };

  currentUser: User = {
    id: '',
    name: 'Administrador',
    email: '',
    role: 'administrador'
  };

  readonly mockLogs: ActivityLog[] = [
    { id: '1', user: 'Ana Martínez',  action: 'creó un nuevo curso: Cálculo I',         timestamp: 'Hace 5 min',  type: 'create' },
    { id: '2', user: 'Juan Pérez',    action: 'actualizó el horario del Aula 302',       timestamp: 'Hace 12 min', type: 'update' },
    { id: '3', user: 'Roberto Gómez', action: 'fue asignado al Turno Noche',             timestamp: 'Hace 45 min', type: 'assign' },
    { id: '4', user: 'Admin',         action: 'eliminó un registro de planilla antiguo', timestamp: 'Hace 2h',     type: 'delete' },
  ];

  private apiUrl = 'http://localhost:8000';

  constructor(
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private reportService: ReportService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userData = this.auth.getUserData();
    if (userData) {
      this.currentUser = {
        id:    String(userData.id_usuario),
        name:  userData.nombre,
        email: userData.correo || '',
        role:  'administrador'
      };
    }

    forkJoin({
      usuarios:  this.http.get<any[]>(`${this.apiUrl}/usuarios/`).pipe(catchError(() => of([]))),
      docentes:  this.http.get<any[]>(`${this.apiUrl}/docentes/`).pipe(catchError(() => of([]))),
      novedades: this.http.get<any[]>(`${this.apiUrl}/novedades/`).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ usuarios, docentes, novedades }) => {
        const reports = this.reportService.getReports();
        const auxiliares = usuarios.filter((u: any) => u.rol?.rol_id === 2);
        this.stats = {
          totalUsers:                  usuarios.length,
          totalDocentes:               docentes.length,
          totalAuxiliares:             auxiliares.length,
          totalReports:                novedades.length + reports.length,
          totalProyectoresFallando:    reports.filter(r => !r.proyectorFunciona).length,
          totalProfesoresNoAsistieron: reports.filter(r => !r.profesorAsistio).length
        };
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        const reports = this.reportService.getReports();
        this.stats = {
          totalUsers:                  0,
          totalDocentes:               0,
          totalAuxiliares:             0,
          totalReports:                reports.length,
          totalProyectoresFallando:    reports.filter(r => !r.proyectorFunciona).length,
          totalProfesoresNoAsistieron: reports.filter(r => !r.profesorAsistio).length
        };
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get currentDateTime(): string {
    const d = new Date();
    return `${d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  }

  get welcomeTitle(): string {
    const titles: Record<string, string> = {
      dashboard: 'Panel de Administrador',
      charts:    'Panel de Administrador',
      users:     'Gestión de Usuarios',
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
    this.activeTab  = 'charts';
  }

  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}