import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, AulaCheck, PlanillaTrabajo } from '../../../models/edu.models';

@Component({
  selector: 'app-auxiliar-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auxiliar-dashboard.html',
  styleUrls: ['./auxiliar-dashboard.css']
})
export class AuxiliarDashboardComponent implements OnInit {
  @Input() user!: User;
  @Output() logout = new EventEmitter<void>();

  selectedAula: AulaCheck | null = null;
  editorData!: AulaCheck;

  planilla: PlanillaTrabajo = {
    id: 'pl-102',
    edificio: 'Edificio Central - Ala Norte',
    turno: 'Mañana (08:00 - 12:00)',
    auxiliarId: 'aux-01',
    fecha: new Date().toISOString(),
    aulas: [
      {
        id: '1',
        aulaNombre: 'Aula 101',
        docenteNombre: 'Prof. Carlos Ruiz',
        nombreClase: 'Álgebra Lineal',
        codigoClase: 'ALG-101',
        estudiantesMatriculados: 35,
        horaInicio: '08:00',
        asistenciaDocente: true,
        novedades: '',
        completado: false
      },
      {
        id: '2',
        aulaNombre: 'Aula 102',
        docenteNombre: 'Dra. Elena Gomez',
        nombreClase: 'Cálculo Diferencial',
        codigoClase: 'CAL-202',
        estudiantesMatriculados: 28,
        horaInicio: '08:30',
        asistenciaDocente: true,
        novedades: '',
        completado: false
      },
      {
        id: '3',
        aulaNombre: 'Laboratorio de Informática',
        docenteNombre: 'Ing. Marcos Sosa',
        nombreClase: 'Programación I',
        codigoClase: 'PRG-001',
        estudiantesMatriculados: 20,
        horaInicio: '09:15',
        asistenciaDocente: true,
        novedades: '',
        completado: false
      },
      {
        id: '4',
        aulaNombre: 'Aula 201',
        docenteNombre: 'Prof. Lucía Mendez',
        nombreClase: 'Física I',
        codigoClase: 'FIS-110',
        estudiantesMatriculados: 42,
        horaInicio: '10:00',
        asistenciaDocente: true,
        novedades: '',
        completado: false
      },
      {
        id: '5',
        aulaNombre: 'Auditorio B',
        docenteNombre: 'Dr. Roberto Diaz',
        nombreClase: 'Historia de la Ciencia',
        codigoClase: 'HIS-005',
        estudiantesMatriculados: 120,
        horaInicio: '10:30',
        asistenciaDocente: false,
        novedades: 'Falta sin aviso previo',
        completado: true
      }
    ]
  };

  ngOnInit(): void {}

  /** Devuelve true si la hora de inicio ya pasó */
  isStarted(horaInicio: string): boolean {
    const [hours, minutes] = horaInicio.split(':').map(Number);
    const classTime = new Date();
    classTime.setHours(hours, minutes, 0, 0);
    return new Date() >= classTime;
  }

  get completedCount(): number {
    return this.planilla.aulas.filter(a => a.completado).length;
  }

  get progressPercent(): number {
    return (this.completedCount / this.planilla.aulas.length) * 100;
  }

  openEditor(aula: AulaCheck): void {
    this.selectedAula = aula;
    this.editorData = { ...aula };
  }

  closeEditor(): void {
    this.selectedAula = null;
  }

  toggleAsistencia(): void {
    this.editorData = { ...this.editorData, asistenciaDocente: !this.editorData.asistenciaDocente };
  }

  onNovedadesChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.editorData = { ...this.editorData, novedades: value };
  }

  saveEditor(): void {
    if (!this.selectedAula) return;
    const saved: AulaCheck = { ...this.editorData, completado: true };
    this.planilla = {
      ...this.planilla,
      aulas: this.planilla.aulas.map(a => a.id === saved.id ? saved : a)
    };
    this.selectedAula = null;
  }

  onLogout(): void {
    this.logout.emit();
  }
}