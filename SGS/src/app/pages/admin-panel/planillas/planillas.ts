// src/app/pages/admin-panel/planillas/planillas.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * /admin/planillas
 *
 * 🚧 Stub temporal — pendiente de implementar en la siguiente fase.
 * Mantiene la estructura para que el routing y el sidebar funcionen.
 */
@Component({
  selector: 'app-admin-planillas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'planillas.html',
  styleUrls: ['planillas.css']
})
export class AdminPlanillasComponent {
  titulo  = 'Planillas';
  icono   = 'assignment';
  descripcion = 'CRUD de planillas con configuración de aulas y carga de clases.';
}
