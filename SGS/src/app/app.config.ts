// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth-interceptor';

/**
 * Configuración global de la app.
 *
 * - provideRouter: rutas
 * - provideHttpClient: cliente HTTP con interceptor de auth
 * - provideCharts: registra los componentes de Chart.js para ng2-charts
 *   (necesario para que los `<canvas baseChart>` rendericen).
 *
 * NOTA: este proyecto está configurado en modo zoneless (sin Zone.js)
 * desde main.ts, por eso NO usamos provideZoneChangeDetection.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideCharts(withDefaultRegisterables()),
  ]
};