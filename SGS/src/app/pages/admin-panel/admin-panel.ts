// src/app/pages/admin-panel/admin-panel.ts
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import { SidebarComponent }     from '../../components/sidebar/sidebar';
import { HeaderAdminComponent, HeaderUser } from '../../components/header-admin/header-admin';
import { AuthService }          from '../../services/auth';

/**
 * Shell del Panel Admin.
 *
 * - Renderiza sidebar + header + <router-outlet>.
 * - El sidebar es off-canvas en móvil/tablet y fijo en desktop (≥1024px).
 * - El título del header se calcula a partir de la URL activa.
 * - Las subpantallas se montan por el router (no por *ngIf).
 *
 * Lectura del usuario:
 *   AuthService.getUserData() trae el UserProfile guardado en localStorage
 *   tras el login (campo USER_KEY). Es síncrono y no hace HTTP.
 */
@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    HeaderAdminComponent,
  ],
  templateUrl: 'admin-panel.html',
  styleUrls: ['admin-panel.css'],
})
export class AdminPanelComponent implements OnInit {
  private auth   = inject(AuthService);
  private router = inject(Router);

  // ── Estado ─────────────────────────────────────────────────────
  isLoading       = signal(true);
  sidebarOpen     = signal(false);
  currentRoute    = signal<string>('/admin/dashboard');
  currentUser     = signal<HeaderUser | null>(null);

  // Título derivado de la ruta
  readonly pageTitle = computed(() => {
    const titles: Record<string, string> = {
      '/admin/dashboard':   'Panel de Administrador',
      '/admin/auxiliares':  'Gestión de Auxiliares',
      '/admin/edificios':   'Gestión de Edificios',
      '/admin/planillas':   'Gestión de Planillas',
      '/admin/turnos':      'Gestión de Turnos',
      '/admin/docentes':    'Gestión de Docentes',
      '/admin/horarios':    'Asignación de Horarios',
      '/admin/novedades':   'Novedades Reportadas',
      '/admin/solicitudes': 'Solicitudes Reportadas',
      '/admin/registros':   'Registros de Aula',
      '/admin/reportes':    'Reportes y Exportación',
    };
    return titles[this.currentRoute()] ?? 'Panel de Administrador';
  });

  ngOnInit(): void {
    // 1) Cargar usuario actual desde localStorage
    const userData = this.auth.getUserData();

    if (userData) {
      this.currentUser.set({
        nombre: userData.nombre ?? 'Administrador',
        correo: userData.correo ?? '',
        rol:    userData.rol?.nombre_rol ?? 'Administrador',
      });
    } else {
      // Fallback: si por algún motivo no hay datos en localStorage
      // (p.ej. el usuario abrió la app con un token válido pero sin user_data),
      // mostramos un placeholder y dejamos que el guard maneje la sesión.
      this.currentUser.set({
        nombre: 'Administrador',
        correo: '',
        rol:    'Administrador',
      });
    }

    this.isLoading.set(false);

    // 2) Trackear ruta para el título dinámico del header
    this.currentRoute.set(this.router.url);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.currentRoute.set(e.urlAfterRedirects));
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  onLogout(): void {
    this.auth.logoutAndRedirect();
  }
}