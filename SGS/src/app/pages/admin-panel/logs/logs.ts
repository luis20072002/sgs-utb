import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logs.html',
  styleUrls: ['./logs.css']
})
export class LogsComponent implements OnInit {
  registros:   any[] = [];
  filtrados:   any[] = [];
  isLoading  = signal(true);
  errorMsg   = signal('');

  // Filtros
  filtroFecha = '';
  filtroAsistencia = '';
  filtroAV = '';

  constructor(private userService: UserService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.errorMsg.set('');
    this.userService.getRegistros().subscribe({
      next: (data) => {
        this.registros = data.sort((a: any, b: any) =>
          new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime()
        );
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudieron cargar los registros.');
        this.isLoading.set(false);
      }
    });
  }

  applyFilters(): void {
    this.filtrados = this.registros.filter(r => {
      const okFecha = !this.filtroFecha || r.fecha_registro === this.filtroFecha;
      const okAsist = this.filtroAsistencia === ''
        || r.asistencia_docente === (this.filtroAsistencia === 'true');
      const okAV    = this.filtroAV === ''
        || r.uso_medios_audiovisuales === (this.filtroAV === 'true');
      return okFecha && okAsist && okAV;
    });
  }

  clearFilters(): void {
    this.filtroFecha = '';
    this.filtroAsistencia = '';
    this.filtroAV = '';
    this.applyFilters();
  }

  get totalAsistio(): number {
    return this.filtrados.filter(r => r.asistencia_docente).length;
  }
  get totalNoAsistio(): number {
    return this.filtrados.filter(r => !r.asistencia_docente).length;
  }
  get totalConAV(): number {
    return this.filtrados.filter(r => r.uso_medios_audiovisuales).length;
  }
}
