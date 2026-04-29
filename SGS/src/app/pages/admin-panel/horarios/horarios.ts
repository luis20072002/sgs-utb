// src/app/pages/admin-panel/horarios/horarios.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * /admin/horarios
 *
 * 🚧 Stub temporal — pendiente de implementar en la siguiente fase.
 * Mantiene la estructura para que el routing y el sidebar funcionen.
 */
@Component({
  selector: 'app-admin-horarios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'horarios.html',
  styleUrls: ['horarios.css']
})
export class AdminHorariosComponent {
  titulo  = 'Horarios';
  icono   = 'calendar_month';
  descripcion = 'Asignación de horarios laborales con validación de turnos consecutivos.';
}
