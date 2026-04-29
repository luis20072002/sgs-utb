// src/app/pages/admin-panel/registros/registros.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * /admin/registros
 *
 * 🚧 Stub temporal — pendiente de implementar en la siguiente fase.
 * Mantiene la estructura para que el routing y el sidebar funcionen.
 */
@Component({
  selector: 'app-admin-registros',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'registros.html',
  styleUrls: ['registros.css']
})
export class AdminRegistrosComponent {
  titulo  = 'Registros';
  icono   = 'history';
  descripcion = 'Visualización de registros de aula con filtros y gráficas detalladas.';
}
