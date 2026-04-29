// src/app/pages/admin-panel/docentes/docentes.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * /admin/docentes
 *
 * 🚧 Stub temporal — pendiente de implementar en la siguiente fase.
 * Mantiene la estructura para que el routing y el sidebar funcionen.
 */
@Component({
  selector: 'app-admin-docentes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'docentes.html',
  styleUrls: ['docentes.css']
})
export class AdminDocentesComponent {
  titulo  = 'Docentes';
  icono   = 'person_pin';
  descripcion = 'CRUD de docentes con sección de análisis visual de asistencia.';
}
