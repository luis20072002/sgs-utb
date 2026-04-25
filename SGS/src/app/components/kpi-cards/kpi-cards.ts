import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KPIStats } from '../../../models/edu.models';
 
interface KPICard {
  label: string;
  value: number;
  icon: string;
  colorClass: string;
  trend: string;
}
 
@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'kpi-cards.html',
  styleUrls: ['kpi-cards.css']
})
export class KpiCardsComponent {
  @Output() cardClick = new EventEmitter<void>();
 
  @Input() set stats(value: KPIStats) {
    this.cards = [
      {
        label:      'Usuarios registrados',
        value:      value.totalUsers,
        icon:       'group',
        colorClass: 'kpi-card--indigo',
        trend:      `${value.totalAuxiliares} aux · ${value.totalDocentes} doc`
      },
      {
        label:      'Auxiliares',
        value:      value.totalAuxiliares,
        icon:       'support_agent',
        colorClass: 'kpi-card--blue',
        trend:      `de ${value.totalUsers} usuarios`
      },
      {
        label:      'Reportes enviados',
        value:      value.totalReports,
        icon:       'assessment',
        colorClass: 'kpi-card--violet',
        trend:      value.totalReports === 0 ? 'Sin reportes aún' : `${value.totalProfesoresNoAsistieron} prof. no asistieron`
      },
      {
        label:      'Proyectores con falla',
        value:      value.totalProyectoresFallando,
        icon:       'videocam_off',
        colorClass: value.totalProyectoresFallando > 0 ? 'kpi-card--red' : 'kpi-card--emerald',
        trend:      value.totalProyectoresFallando > 0
                      ? `de ${value.totalReports} reportes`
                      : 'Sin problemas reportados'
      },
    ];
  }
 
  cards: KPICard[] = [];
 
  onCardClick() { this.cardClick.emit(); }
}