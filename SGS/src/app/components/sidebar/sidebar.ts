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
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', path: '/admin' }
  ];
 
  gestionItems: MenuItem[] = [
    { id: 'users',      icon: 'group',        label: 'Usuarios',  path: '/admin/users' },
    { id: 'roles',      icon: 'verified_user', label: 'Roles',     path: '/admin/roles' },
    { id: 'teachers',   icon: 'person_pin',   label: 'Docentes',  path: '/admin/teachers' },
    { id: 'courses',    icon: 'menu_book',    label: 'Cursos',    path: '/admin/courses' },
    { id: 'classrooms', icon: 'school',       label: 'Aulas',     path: '/admin/classrooms' },
    { id: 'shifts',     icon: 'schedule',     label: 'Turnos',    path: '/admin/shifts' }
  ];
 
  informesItems: MenuItem[] = [
    { id: 'schedules',  icon: 'calendar_month', label: 'Horarios',  path: '/admin/schedules' },
    { id: 'templates',  icon: 'description',    label: 'Planillas', path: '/admin/templates' },
    { id: 'logs',       icon: 'history',        label: 'Registros', path: '/admin/logs' }
  ];
 
  changeTab(id: string): void {
    this.tabChange.emit(id);
  }
 
  isActive(id: string): boolean {
    return this.activeTab === id;
  }
}