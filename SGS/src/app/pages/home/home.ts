import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { ReportService, Report } from '../../services/report';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
 
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent {
  form: FormGroup;
  isLoading = signal(false);
  submitted = signal(false);
  successMsg = signal('');
 
  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private reportService: ReportService,
    private router: Router
  ) {
    this.form = this.fb.group({
      auxiliarName: ['Juan Pérez', Validators.required],
      auxiliarEmail: ['auxiliar@sgs.com', Validators.required],
      aula: ['', Validators.required],
      materia: ['', Validators.required],
      profesorAsistio: [null, Validators.required],
      proyectorFunciona: [null, Validators.required],
      observaciones: ['']
    });
  }
 
  submitReport() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
 
    this.isLoading.set(true);
    const now = new Date();
    const v = this.form.value;
 
    const report: Report = {
      id: this.reportService.generateId(),
      auxiliarName: v.auxiliarName,
      auxiliarEmail: v.auxiliarEmail,
      aula: v.aula,
      materia: v.materia,
      profesorAsistio: v.profesorAsistio === 'true' || v.profesorAsistio === true,
      proyectorFunciona: v.proyectorFunciona === 'true' || v.proyectorFunciona === true,
      observaciones: v.observaciones || 'Sin observaciones adicionales.',
      fecha: now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
 
    this.reportService.saveReport(report);
    this.generateAndDownloadPDF(report);
 
    setTimeout(() => {
      this.isLoading.set(false);
      this.successMsg.set('Reporte enviado y descargado exitosamente.');
      this.form.reset({ auxiliarName: v.auxiliarName, auxiliarEmail: v.auxiliarEmail });
      this.submitted.set(true);
      setTimeout(() => { this.successMsg.set(''); this.submitted.set(false); }, 4000);
    }, 800);
  }
 
  private generateAndDownloadPDF(r: Report) {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;
 
    // ── Encabezado con fondo azul ──────────────────────────────
    doc.setFillColor(30, 80, 160);
    doc.rect(0, 0, pageWidth, 38, 'F');
 
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('SGS - Sistema de Gestión Escolar', margin, 16);
 
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('REPORTE DE AULA', margin, 28);
 
    y = 50;
 
    // ── Sección: Datos del reporte ─────────────────────────────
    doc.setTextColor(30, 80, 160);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DATOS DEL REPORTE', margin, y);
    y += 4;
 
    doc.setDrawColor(30, 80, 160);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
 
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
 
    const campos: [string, string][] = [
      ['Auxiliar',  r.auxiliarName],
      ['Correo',    r.auxiliarEmail],
      ['Fecha',     r.fecha],
      ['Hora',      r.hora],
      ['Aula',      r.aula],
      ['Materia',   r.materia],
    ];
 
    for (const [label, valor] of campos) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(`${label}:`, margin, y);
 
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(valor, margin + 35, y);
      y += 8;
    }
 
    y += 6;
 
    // ── Sección: Checklist ─────────────────────────────────────
    doc.setTextColor(30, 80, 160);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('CHECKLIST', margin, y);
    y += 4;
 
    doc.setDrawColor(30, 80, 160);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
 
    // Tarjeta: Profesor asistió
    const asistioColor = r.profesorAsistio ? [220, 255, 220] : [255, 220, 220];
    doc.setFillColor(asistioColor[0], asistioColor[1], asistioColor[2]);
    doc.roundedRect(margin, y - 6, 80, 14, 2, 2, 'F');
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Profesor asistió:', margin + 3, y + 1);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r.profesorAsistio ? 0 : 180, r.profesorAsistio ? 120 : 0, 0);
    doc.text(r.profesorAsistio ? 'SÍ ✓' : 'NO ✗', margin + 50, y + 1);
 
    // Tarjeta: Proyector funciona
    const proyectorColor = r.proyectorFunciona ? [220, 255, 220] : [255, 220, 220];
    doc.setFillColor(proyectorColor[0], proyectorColor[1], proyectorColor[2]);
    doc.roundedRect(margin + 90, y - 6, 80, 14, 2, 2, 'F');
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.text('Proyector funciona:', margin + 93, y + 1);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r.proyectorFunciona ? 0 : 180, r.proyectorFunciona ? 120 : 0, 0);
    doc.text(r.proyectorFunciona ? 'SÍ ✓' : 'NO ✗', margin + 143, y + 1);
 
    y += 20;
 
    // ── Sección: Observaciones ─────────────────────────────────
    doc.setTextColor(30, 80, 160);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('OBSERVACIONES', margin, y);
    y += 4;
 
    doc.setDrawColor(30, 80, 160);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
 
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(r.observaciones, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 6 + 12;
 
    // ── Footer ─────────────────────────────────────────────────
    doc.setFillColor(245, 245, 245);
    doc.rect(0, y, pageWidth, 20, 'F');
 
    doc.setDrawColor(200, 200, 200);
    doc.line(0, y, pageWidth, y);
 
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reporte generado automáticamente por SGS`, margin, y + 8);
    doc.text(`ID: ${r.id}`, margin, y + 14);
    doc.text(`${r.fecha} ${r.hora}`, pageWidth - margin, y + 11, { align: 'right' });
 
    // ── Guardar ────────────────────────────────────────────────
    doc.save(`Reporte_${r.aula}_${r.fecha.replace(/\//g, '-')}.pdf`);
  }
 
  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
 
  hasError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}
 