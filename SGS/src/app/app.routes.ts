// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { AdminPanelComponent } from './pages/admin-panel/admin-panel';
import { HomeComponent } from './pages/home/home';
import { UsersComponent } from './pages/admin-panel/users/users';
import { authGuard, adminGuard, auxiliarGuard } from './guards/auth.guard';

import { HomeDashboardComponent }   from './pages/home/dashboard/dashboard';
import { HomePlanillaComponent }    from './pages/home/planilla/planilla';
import { HomeSolicitudesComponent } from './pages/home/solicitudes/solicitudes';
import { HomeNovedadesComponent }   from './pages/home/novedades/novedades';
import { HomeHorarioComponent }     from './pages/home/horario/horario';
import { HomePerfilComponent }      from './pages/home/perfil/perfil';
/**
 * Rutas alineadas a los requerimientos:
 *   /login                       → pantalla de inicio de sesión
 *   /admin/dashboard             → panel del administrador
 *   /admin/auxiliares            → gestión de auxiliares (subpantalla)
 *   /home                        → pantalla principal del auxiliar
 *
 * Guards:
 *   authGuard      → solo usuarios logueados
 *   adminGuard     → solo rol "administrador"
 *   auxiliarGuard  → solo rol "auxiliar"
 */
export const routes: Routes = [
  // Raíz redirige al login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Login (público)
  { path: 'login', component: Login },

  // Zona admin (protegida por adminGuard)
  {
    path: 'admin',
    component: AdminPanelComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',  component: AdminPanelComponent },
      { path: 'auxiliares', component: UsersComponent }
      // Aquí más subpantallas conforme se vayan creando:
      // { path: 'docentes',  component: TeachersComponent },
      // { path: 'cursos',    component: CoursesComponent },
      // { path: 'reportes',  component: ReportsComponent },
      // { path: 'horarios',  component: SchedulesComponent },
      // { path: 'registros', component: LogsComponent },
    ]
  },

  // Zona auxiliar (protegida por auxiliarGuard)
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