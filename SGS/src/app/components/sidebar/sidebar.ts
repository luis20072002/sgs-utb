// src/app/components/sidebar/sidebar.ts
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

  // Rutas alineadas a los requerimientos:
  //   /admin/dashboard, /admin/auxiliares, /admin/docentes, etc.
  dashboardItems: MenuItem[] = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' }
  ];

  gestionItems: MenuItem[] = [
    { id: 'auxiliares', icon: 'group',      label: 'Auxiliares', path: '/admin/auxiliares' },
    { id: 'docentes',   icon: 'person_pin', label: 'Docentes',   path: '/admin/docentes'   },
    { id: 'cursos',     icon: 'menu_book',  label: 'Cursos',     path: '/admin/cursos'     },
  ];

  informesItems: MenuItem[] = [
    { id: 'reportes',  icon: 'description',    label: 'Reportes',                path: '/admin/reportes'  },
    { id: 'av-issues', icon: 'videocam_off',   label: 'Problemas audiovisuales', path: '/admin/av-issues' },
    { id: 'horarios',  icon: 'calendar_month', label: 'Horarios',                path: '/admin/horarios'  },
    { id: 'registros', icon: 'history',        label: 'Registros',               path: '/admin/registros' },
  ];

  changeTab(id: string): void { this.tabChange.emit(id); }
  isActive(id: string): boolean { return this.activeTab === id; }
}