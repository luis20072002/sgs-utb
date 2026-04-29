// src/app/pages/admin-panel/turnos/turnos.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * /admin/turnos
 *
 * 🚧 Stub temporal — pendiente de implementar en la siguiente fase.
 * Mantiene la estructura para que el routing y el sidebar funcionen.
 */
@Component({
  selector: 'app-admin-turnos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'turnos.html',
  styleUrls: ['turnos.css']
})
export class AdminTurnosComponent {
  titulo  = 'Turnos';
  icono   = 'schedule';
  descripcion = 'CRUD de turnos globales (Turno 1, 2, 3) con sus rangos horarios.';
}
