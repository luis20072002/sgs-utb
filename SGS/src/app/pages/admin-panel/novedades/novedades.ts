// src/app/pages/admin-panel/novedades/novedades.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * /admin/novedades
 *
 * 🚧 Stub temporal — pendiente de implementar en la siguiente fase.
 * Mantiene la estructura para que el routing y el sidebar funcionen.
 */
@Component({
  selector: 'app-admin-novedades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'novedades.html',
  styleUrls: ['novedades.css']
})
export class AdminNovedadesComponent {
  titulo  = 'Novedades';
  icono   = 'campaign';
  descripcion = 'Visualización de novedades reportadas con filtros y gráficas.';
}
