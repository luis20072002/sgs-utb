// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { AdminPanelComponent } from './pages/admin-panel/admin-panel';
import { HomeComponent } from './pages/home/home';
import { authGuard, adminGuard, auxiliarGuard } from './guards/auth.guard';

// ── Subpantallas del Admin ────────────────────────────────────────────
import { AdminDashboardComponent }    from './pages/admin-panel/dashboard/dashboard';
import { AdminAuxiliaresComponent }   from './pages/admin-panel/auxiliares/auxiliares';
import { AdminEdificiosComponent }    from './pages/admin-panel/edificios/edificios';
import { AdminPlanillasComponent }    from './pages/admin-panel/planillas/planillas';
import { AdminTurnosComponent }       from './pages/admin-panel/turnos/turnos';
import { AdminDocentesComponent }     from './pages/admin-panel/docentes/docentes';
import { AdminHorariosComponent }     from './pages/admin-panel/horarios/horarios';
import { AdminNovedadesComponent }    from './pages/admin-panel/novedades/novedades';
import { AdminSolicitudesComponent }  from './pages/admin-panel/solicitudes/solicitudes';
import { AdminRegistrosComponent }    from './pages/admin-panel/registros/registros';
import { AdminReportesComponent }     from './pages/admin-panel/reportes/reportes';

// ── Subpantallas del Auxiliar ─────────────────────────────────────────
import { HomeDashboardComponent }     from './pages/home/dashboard/dashboard';
import { HomePlanillaComponent }      from './pages/home/planilla/planilla';
import { HomeSolicitudesComponent }   from './pages/home/solicitudes/solicitudes';
import { HomeNovedadesComponent }     from './pages/home/novedades/novedades';
import { HomeHorarioComponent }       from './pages/home/horario/horario';
import { HomePerfilComponent }        from './pages/home/perfil/perfil';

/**
 * Rutas alineadas a los requerimientos del documento.
 *
 *   /login                       → pantalla de inicio de sesión
 *   /admin/dashboard             → panel del administrador (KPIs + alertas)
 *   /admin/auxiliares            → gestión de auxiliares
 *   /admin/edificios             → CRUD edificios + aulas
 *   /admin/planillas             → CRUD planillas + configuración de clases
 *   /admin/turnos                → CRUD turnos
 *   /admin/docentes              → CRUD docentes + analítica
 *   /admin/horarios              → asignación de horarios a auxiliares
 *   /admin/novedades             → visualización de novedades + analítica
 *   /admin/solicitudes           → gestión de solicitudes + analítica
 *   /admin/registros             → visualización de registros + analítica
 *   /admin/reportes              → exportación Excel/PDF
 *   /home                        → pantalla principal del auxiliar
 *
 * Guards:
 *   authGuard      → solo usuarios logueados
 *   adminGuard     → solo rol "administrador" (rol_id = 1)
 *   auxiliarGuard  → solo rol "auxiliar"      (rol_id = 2)
 */
export const routes: Routes = [
  // Raíz redirige al login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Login (público)
  { path: 'login', component: Login },

  // ─────────────────────────────────────────────────────────────────
  // Zona Admin
  // ─────────────────────────────────────────────────────────────────
  {
    path: 'admin',
    component: AdminPanelComponent,
    canActivate: [adminGuard],
    children: [
      { path: '',             redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',    component: AdminDashboardComponent },
      { path: 'auxiliares',   component: AdminAuxiliaresComponent },
      { path: 'edificios',    component: AdminEdificiosComponent },
      { path: 'planillas',    component: AdminPlanillasComponent },
      { path: 'turnos',       component: AdminTurnosComponent },
      { path: 'docentes',     component: AdminDocentesComponent },
      { path: 'horarios',     component: AdminHorariosComponent },
      { path: 'novedades',    component: AdminNovedadesComponent },
      { path: 'solicitudes',  component: AdminSolicitudesComponent },
      { path: 'registros',    component: AdminRegistrosComponent },
      { path: 'reportes',     component: AdminReportesComponent },
    ]
  },

  // ─────────────────────────────────────────────────────────────────
  // Zona Auxiliar
  // ─────────────────────────────────────────────────────────────────
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [auxiliarGuard],
    children: [
      { path: '',            component: HomeDashboardComponent },
      { path: 'planilla',    component: HomePlanillaComponent },
      { path: 'solicitudes', component: HomeSolicitudesComponent },
      { path: 'novedades',   component: HomeNovedadesComponent },
      { path: 'horario',     component: HomeHorarioComponent },
      { path: 'perfil',      component: HomePerfilComponent }
    ]
  },

  // Cualquier ruta desconocida vuelve al login
  { path: '**', redirectTo: 'login' }
];
