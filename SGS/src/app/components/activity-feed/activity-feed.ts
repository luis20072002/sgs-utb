import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityLog, Alert } from '../../../models/edu.models';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'activity-feed.html',
  styleUrls: ['activity-feed.css']
})
export class ActivityFeedComponent {
  @Input() logs: ActivityLog[] = [];
  @Input() alerts: Alert[] = [];

  getLogModuleLabel(type: string): string {
    const map: Record<string, string> = {
      create: 'Cursos',
      assign: 'Turnos',
      update: 'Sistema',
      delete: 'Sistema'
    };
    return map[type] ?? 'Sistema';
  }

  getAlertClass(type: string): string {
    const map: Record<string, string> = {
      warning: 'alert-item--warning',
      error:   'alert-item--error',
      info:    'alert-item--info'
    };
    return map[type] ?? 'alert-item--info';
  }

  getAlertIcon(type: string): string {
    const map: Record<string, string> = {
      warning: '⚠️',
      error:   '🔴',
      info:    'ℹ️'
    };
    return map[type] ?? 'ℹ️';
  }
}