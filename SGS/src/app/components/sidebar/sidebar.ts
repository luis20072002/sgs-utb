// src/app/components/sidebar/sidebar.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface SidebarItem {
  id: string;
  icon: string;
  label: string;
  path: string;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: 'sidebar.html',
  styleUrls: ['sidebar.css']
})
export class SidebarComponent {
  /** Controla la visibilidad en móvil (off-canvas) */
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  /**
   * Estructura del menú alineada al documento:
   *   Dashboard → Dashboard
   *   Gestión   → Auxiliares, Planillas, Turnos, Edificios, Docentes
   *   Operación → Horarios, Novedades, Solicitudes, Registros
   *   Informes  → Reportes
   */
  sections: SidebarSection[] = [
    {
      label: 'Dashboard',
      items: [
        { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
      ],
    },
    {
      label: 'Gestión',
      items: [
        { id: 'auxiliares', icon: 'group',         label: 'Auxiliares', path: '/admin/auxiliares' },
        { id: 'planillas',  icon: 'assignment',    label: 'Planillas',  path: '/admin/planillas'  },
        { id: 'turnos',     icon: 'schedule',      label: 'Turnos',     path: '/admin/turnos'     },
        { id: 'edificios',  icon: 'apartment',     label: 'Edificios',  path: '/admin/edificios'  },
        { id: 'docentes',   icon: 'person_pin',    label: 'Docentes',   path: '/admin/docentes'   },
      ],
    },
    {
      label: 'Operación',
      items: [
        { id: 'horarios',    icon: 'calendar_month',     label: 'Horarios',    path: '/admin/horarios'    },
        { id: 'novedades',   icon: 'campaign',           label: 'Novedades',   path: '/admin/novedades'   },
        { id: 'solicitudes', icon: 'support_agent',      label: 'Solicitudes', path: '/admin/solicitudes' },
        { id: 'registros',   icon: 'history',            label: 'Registros',   path: '/admin/registros'   },
      ],
    },
    {
      label: 'Informes',
      items: [
        { id: 'reportes', icon: 'description', label: 'Reportes', path: '/admin/reportes' },
      ],
    },
  ];

  onItemClick(): void {
    // En móvil cerramos el sidebar al navegar
    if (window.innerWidth < 1024) {
      this.close.emit();
    }
  }
}
