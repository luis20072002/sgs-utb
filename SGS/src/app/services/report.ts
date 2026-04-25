import { Injectable } from '@angular/core';

export interface Report {
  id: string;
  auxiliarName: string;
  auxiliarEmail: string;
  fecha: string;
  hora: string;
  profesorAsistio: boolean;
  proyectorFunciona: boolean;
  observaciones: string;
  aula: string;
  materia: string;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private storageKey = 'sgs_reports';

  getReports(): Report[] {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch {
      return [];
    }
  }

  saveReport(report: Report): void {
    const reports = this.getReports();
    reports.unshift(report);
    localStorage.setItem(this.storageKey, JSON.stringify(reports));
  }

  generateId(): string {
    return 'rpt_' + Date.now();
  }
}
