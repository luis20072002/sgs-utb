import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityLog } from '../../../models/edu.models';
import { ReportService, Report } from '../../services/report';
 
@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'activity-feed.html',
  styleUrls: ['activity-feed.css']
})
export class ActivityFeedComponent implements OnChanges {
  @Input() logs: ActivityLog[] = [];
 
  audiovisualAlerts: Report[] = [];
  selectedReport: Report | null = null;
 
  constructor(private reportService: ReportService) {}
 
  ngOnChanges(): void {
    this.loadAlerts();
  }
 
  loadAlerts(): void {
    const reports = this.reportService.getReports();
    // Solo muestra reportes donde el proyector NO funciona
    this.audiovisualAlerts = reports.filter(r => !r.proyectorFunciona);
  }
 
  selectAlert(r: Report): void {
    this.selectedReport = this.selectedReport?.id === r.id ? null : r;
  }
 
  closeModal(): void {
    this.selectedReport = null;
  }
 
  getLogModuleLabel(type: string): string {
    const map: Record<string, string> = {
      create: 'Reporte',
      assign: 'Turnos',
      update: 'Sistema',
      delete: 'Sistema'
    };
    return map[type] ?? 'Sistema';
  }
}