import { Component, Input, OnChanges, signal } from '@angular/core';
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
 
  resolving = signal(false);
  resolvedId = signal<string | null>(null);
 
  constructor(private reportService: ReportService) {}
 
  ngOnChanges(): void {
    this.loadAlerts();
  }
 
  loadAlerts(): void {
    const reports = this.reportService.getReports();
    this.audiovisualAlerts = reports.filter(r => !r.proyectorFunciona);
  }
 
  selectAlert(r: Report): void {
    this.selectedReport = this.selectedReport?.id === r.id ? null : r;
  }
 
  closeModal(): void {
    if (this.resolving()) return;
    this.selectedReport = null;
  }
 
  resolveAlert(): void {
    if (!this.selectedReport || this.resolving()) return;
 
    const id = this.selectedReport.id;
    this.resolving.set(true);
 
    setTimeout(() => {
      this.reportService.deleteReport(id);
      this.resolvedId.set(id);
 
      // Animar salida y luego quitar de la lista
      setTimeout(() => {
        this.loadAlerts();
        this.resolving.set(false);
        this.resolvedId.set(null);
        this.selectedReport = null;
      }, 400);
    }, 600);
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
 