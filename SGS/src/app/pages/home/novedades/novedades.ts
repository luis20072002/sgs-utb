// src/app/pages/home/novedades/novedades.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuxiliarService, Novedad, FiltroFechas } from '../../../services/auxiliar.service';

@Component({
  selector: 'app-home-novedades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './novedades.html',
  styleUrls: ['./novedades.css']
})
export class HomeNovedadesComponent implements OnInit {
  isLoading = signal(true);
  novedades = signal<Novedad[]>([]);
  errorMsg  = signal('');

  fechaInicio = signal('');
  fechaFin    = signal('');

  constructor(private auxiliarService: AuxiliarService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMsg.set('');

    const filtro: FiltroFechas = {};
    if (this.fechaInicio()) filtro.fecha_inicio = this.fechaInicio();
    if (this.fechaFin())    filtro.fecha_fin    = this.fechaFin();

    this.auxiliarService.getMisNovedades(filtro).subscribe({
      next: (data) => {
        // Ordenamos por fecha descendente (más recientes primero)
        const sorted = [...data].sort(
          (a, b) => new Date(b.fecha_novedad).getTime() - new Date(a.fecha_novedad).getTime()
        );
        this.novedades.set(sorted);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudieron cargar las novedades.');
        this.isLoading.set(false);
      }
    });
  }

  aplicar(): void { this.load(); }
  limpiar(): void {
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.load();
  }

  // Helper: agrupar por día para mostrar timeline
  groupedByDay(): { day: string; items: Novedad[] }[] {
    const groups: Record<string, Novedad[]> = {};
    for (const n of this.novedades()) {
      const day = n.fecha_novedad.slice(0, 10);
      (groups[day] ??= []).push(n);
    }
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, items]) => ({ day, items }));
  }

  formatDayLabel(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const ayer = new Date(today); ayer.setDate(ayer.getDate() - 1);
    if (d.getTime() === today.getTime()) return 'Hoy';
    if (d.getTime() === ayer.getTime())  return 'Ayer';
    return d.toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

  formatHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit'
    });
  }
}