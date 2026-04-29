// src/app/pages/admin-panel/edificios/edificios.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * /admin/edificios
 *
 * 🚧 Stub temporal — pendiente de implementar en la siguiente fase.
 * Mantiene la estructura para que el routing y el sidebar funcionen.
 */
@Component({
  selector: 'app-admin-edificios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'edificios.html',
  styleUrls: ['edificios.css']
})
export class AdminEdificiosComponent {
  titulo  = 'Edificios';
  icono   = 'apartment';
  descripcion = 'CRUD de edificios con gestión de aulas (carga manual y masiva por .xlsx).';
}
