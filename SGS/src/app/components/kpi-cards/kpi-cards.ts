import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KPIStats } from '../../../models/edu.models';

interface KPICard {
  label: string;
  value: number;
  icon: string;
  colorClass: string;
  trend: string;
}

interface QuickAccessItem {
  label: string;
  emoji: string;
  tab: string;
}

@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'kpi-cards.html',
  styleUrls: ['kpi-cards.css']
})
export class KpiCardsComponent {
  @Input() set stats(value: KPIStats) {
    this.cards = [
      { label: 'Usuarios',  value: value.totalUsers,      icon: 'group',        colorClass: 'kpi-card--indigo',  trend: '+12%' },
      { label: 'Docentes',  value: value.totalTeachers,   icon: 'person_pin',   colorClass: 'kpi-card--emerald', trend: '+2%' },
      { label: 'Cursos',    value: value.totalCourses,     icon: 'menu_book',    colorClass: 'kpi-card--blue',    trend: '+5%' },
      { label: 'Aulas',     value: value.totalClassrooms,  icon: 'school',       colorClass: 'kpi-card--amber',   trend: '0%' },
      { label: 'Turnos',    value: value.totalShifts,      icon: 'schedule',     colorClass: 'kpi-card--rose',    trend: '-1%' },
      { label: 'Planillas', value: value.totalTemplates,   icon: 'description',  colorClass: 'kpi-card--violet',  trend: '+8%' },
    ];
  }

  cards: KPICard[] = [];

  quickAccessItems: QuickAccessItem[] = [
    { label: 'Usuarios',  emoji: '👥', tab: 'users' },
    { label: 'Cursos',    emoji: '📚', tab: 'courses' },
    { label: 'Aulas',     emoji: '🏫', tab: 'classrooms' },
    { label: 'Docentes',  emoji: '🍎', tab: 'teachers' },
    { label: 'Turnos',    emoji: '🕙', tab: 'shifts' },
    { label: 'Planillas', emoji: '📑', tab: 'templates' },
  ];

  isTrendPositive(trend: string): boolean {
    return trend.startsWith('+');
  }

  isTrendNeutral(trend: string): boolean {
    return trend === '0%';
  }

  isTrendNegative(trend: string): boolean {
    return trend.startsWith('-');
  }

  trendLabel(trend: string): string {
    return trend.startsWith('+') ? `${trend} esta semana` : trend;
  }
}