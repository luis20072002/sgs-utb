// src/app/pages/admin-panel/reportes/reportes.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * /admin/reportes
 *
 * 🚧 Stub temporal — pendiente de implementar en la siguiente fase.
 * Mantiene la estructura para que el routing y el sidebar funcionen.
 */
@Component({
  selector: 'app-admin-reportes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'reportes.html',
  styleUrls: ['reportes.css']
})
export class AdminReportesComponent {
  titulo  = 'Reportes';
  icono   = 'description';
  descripcion = 'Exportación de datos en formato Excel o PDF con filtros configurables.';
}
