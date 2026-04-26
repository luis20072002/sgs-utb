import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportService, Report } from '../../../services/report';
 
@Component({
  selector: 'app-av-issues',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './av-issues.html',
  styleUrls: ['./av-issues.css']
})
export class AvIssuesComponent implements OnInit {
 
  issues: Report[] = [];
 
  // ── Modal de confirmación ─────────────────────────────────
  showModal     = signal(false);
  issueToResolve = signal<Report | null>(null);
  resolving     = signal(false);
  justResolved  = signal<string | null>(null); // id del último resuelto (para animación)
 
  constructor(private reportService: ReportService) {}
 
  ngOnInit(): void {
    this.loadIssues();
  }
 
  private loadIssues(): void {
    // Solo reportes donde el proyector falla
    const all = this.reportService.getReports();
    this.issues = all.filter(r => !r.proyectorFunciona);
  }
 
  // ── Abrir / cerrar modal ──────────────────────────────────
  requestResolve(issue: Report): void {
    this.issueToResolve.set(issue);
    this.showModal.set(true);
  }
 
  closeModal(): void {
    if (this.resolving()) return;
    this.showModal.set(false);
    this.issueToResolve.set(null);
  }
 
  // ── Confirmar resolución ──────────────────────────────────
  confirmResolve(): void {
    const target = this.issueToResolve();
    if (!target) return;
 
    this.resolving.set(true);
 
    // Simular pequeño delay de procesamiento
    setTimeout(() => {
      this.reportService.deleteReport(target.id);
      this.justResolved.set(target.id);
 
      // Recargar lista sin el resuelto
      this.loadIssues();
 
      this.resolving.set(false);
      this.showModal.set(false);
      this.issueToResolve.set(null);
 
      // Limpiar bandera de animación
      setTimeout(() => this.justResolved.set(null), 800);
    }, 600);
  }
 
  get totalIssues(): number { return this.issues.length; }
}