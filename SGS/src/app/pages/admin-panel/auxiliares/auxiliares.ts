// src/app/pages/admin-panel/auxiliares/auxiliares.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * /admin/auxiliares
 *
 * 🚧 Stub temporal — pendiente de implementar en la siguiente fase.
 * Mantiene la estructura para que el routing y el sidebar funcionen.
 */
@Component({
  selector: 'app-admin-auxiliares',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'auxiliares.html',
  styleUrls: ['auxiliares.css']
})
export class AdminAuxiliaresComponent {
  titulo  = 'Auxiliares';
  icono   = 'group';
  descripcion = 'Tabla con búsqueda, filtros, paginación, modal CRUD y asignación de edificios.';
}
