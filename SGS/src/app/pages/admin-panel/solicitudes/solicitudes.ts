// src/app/pages/admin-panel/solicitudes/solicitudes.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * /admin/solicitudes
 *
 * 🚧 Stub temporal — pendiente de implementar en la siguiente fase.
 * Mantiene la estructura para que el routing y el sidebar funcionen.
 */
@Component({
  selector: 'app-admin-solicitudes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'solicitudes.html',
  styleUrls: ['solicitudes.css']
})
export class AdminSolicitudesComponent {
  titulo  = 'Solicitudes';
  icono   = 'support_agent';
  descripcion = 'Gestión de solicitudes con cambio de estado y analítica.';
}
