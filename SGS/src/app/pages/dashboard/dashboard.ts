import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { HeaderComponent } from '../../components/header/header';
import { KpiCardsComponent } from '../../components/kpi-cards/kpi-cards';
import { ActivityFeedComponent } from '../../components/activity-feed/activity-feed';
import { User, KPIStats, ActivityLog, Alert } from '../../../models/edu.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent, KpiCardsComponent, ActivityFeedComponent],
  templateUrl: 'dashboard.html',
  styleUrls: ['dashboard.css']
})
export class DashboardComponent implements OnInit {
  isAuthenticated = true;
  isLoading = false;
  isLoginLoading = false;
  activeTab = 'dashboard';
  stats: KPIStats | null = null;
  constructor(private cdr: ChangeDetectorRef) {}  // 👈 agrega esto

  ngOnInit(): void {
    setTimeout(() => {
      this.isLoading = false;
      this.cdr.detectChanges();  // 👈 agrega esto
    }, 1500);
  }

  readonly mockUser: User = {
    id: 'adm_001',
    name: 'Admin EduControl',
    email: 'admin@educontrol.com',
    role: 'administrador',
    avatar: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?q=80&w=400&h=400&auto=format&fit=crop'
  };

  readonly mockStats: KPIStats = {
    totalUsers: 1240,
    totalTeachers: 145,
    totalCourses: 68,
    totalClassrooms: 42,
    totalShifts: 12,
    totalTemplates: 256
  };

  readonly mockLogs: ActivityLog[] = [
    { id: '1', user: 'Ana Martínez',  action: 'creó un nuevo curso: Cálculo I',       timestamp: 'Hace 5 minutos',  type: 'create' },
    { id: '2', user: 'Juan Pérez',    action: 'actualizó el horario del Aula 302',    timestamp: 'Hace 12 minutos', type: 'update' },
    { id: '3', user: 'Roberto Gómez', action: 'fue asignado al Turno Noche',          timestamp: 'Hace 45 minutos', type: 'assign' },
    { id: '4', user: 'Admin',         action: 'eliminó un registro de planilla antiguo', timestamp: 'Hace 2 horas', type: 'delete' },
  ];

  readonly mockAlerts: Alert[] = [
    { id: 'a1', message: 'Hay 12 usuarios pendientes de verificación.',  type: 'warning', timestamp: '1h' },
    { id: 'a2', message: 'Aula B-105 reporta mantenimiento necesario.',  type: 'info',    timestamp: '3h' },
    { id: 'a3', message: 'Conflicto detectado en Turnos del Lunes.',     type: 'error',   timestamp: '5h' },
  ];

  get currentDate(): string {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  get currentDateTime(): string {
    const d = new Date();
    return `${d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  }


  onLogin(event: Event): void {
    event.preventDefault();
    this.isLoginLoading = true;
    setTimeout(() => {
      this.isAuthenticated = true;
      this.isLoginLoading = false;
      // Simula carga de stats
      setTimeout(() => { this.stats = this.mockStats; }, 800);
    }, 1500);
  }

  onLogout(): void {
    this.isAuthenticated = false;
    this.activeTab = '';
    this.stats = null;
  }

  onTabChange(tab: string): void {
    this.activeTab = tab;
  }
}