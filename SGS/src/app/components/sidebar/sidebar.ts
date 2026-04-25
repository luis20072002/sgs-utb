import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuItem } from '../../../models/edu.models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'sidebar.html',
  styleUrls: ['sidebar.css']
})
export class SidebarComponent {
  @Input() activeTab: string = 'dashboard';
  @Output() tabChange = new EventEmitter<string>();

  dashboardItems: MenuItem[] = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', path: '/adminPanel' }
  ];

  gestionItems: MenuItem[] = [
    { id: 'users',    icon: 'group',        label: 'Usuarios', path: '/adminPanel/users' },
    { id: 'teachers', icon: 'person_pin',   label: 'Docentes', path: '/adminPanel/teachers' },
    { id: 'courses',  icon: 'menu_book',    label: 'Cursos',   path: '/adminPanel/courses' },
  ];

  informesItems: MenuItem[] = [
    { id: 'reports',  icon: 'description',    label: 'Reportes',  path: '/adminPanel/reports' },
    { id: 'schedules',icon: 'calendar_month', label: 'Horarios',  path: '/adminPanel/schedules' },
    { id: 'logs',     icon: 'history',        label: 'Registros', path: '/adminPanel/logs' },
  ];

  changeTab(id: string): void { this.tabChange.emit(id); }
  isActive(id: string): boolean { return this.activeTab === id; }
}
