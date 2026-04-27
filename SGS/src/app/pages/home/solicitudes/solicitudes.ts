// src/app/pages/home/solicitudes/solicitudes.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AuxiliarService,
  Solicitud,
  FiltroSolicitudes
} from '../../../services/auxiliar.service';

type EstadoFiltro = '' | 'pendiente' | 'en_proceso' | 'resuelta';

@Component({
  selector: 'app-home-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitudes.html',
  styleUrls: ['./solicitudes.css']
})
export class HomeSolicitudesComponent implements OnInit {
  isLoading   = signal(true);
  solicitudes = signal<Solicitud[]>([]);
  errorMsg    = signal('');

  // Filtros
  filtroEstado = signal<EstadoFiltro>('');
  fechaInicio  = signal('');
  fechaFin     = signal('');

  // Modal de resolución
  showResolveModal = signal(false);
  resolvingId      = signal<number | null>(null);
  resolveNote      = signal('');
  isSubmitting     = signal(false);
  submitError      = signal('');

  // Counts por estado (para tabs)
  counts = computed(() => {
    const all = this.solicitudes();
    return {
      total:      all.length,
      pendiente:  all.filter(s => s.estado === 'pendiente').length,
      en_proceso: all.filter(s => s.estado === 'en_proceso').length,
      resuelta:   all.filter(s => s.estado === 'resuelta').length
    };
  });

  // Lista filtrada
  filtered = computed(() => {
    const f = this.filtroEstado();
    return f ? this.solicitudes().filter(s => s.estado === f) : this.solicitudes();
  });

  constructor(private auxiliarService: AuxiliarService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMsg.set('');

    const filtro: FiltroSolicitudes = {};
    if (this.fechaInicio()) filtro.fecha_inicio = this.fechaInicio();
    if (this.fechaFin())    filtro.fecha_fin    = this.fechaFin();
    // Nota: no enviamos `estado` al backend, filtramos en el cliente para
    // poder mostrar contadores en las tabs sin recargar.

    this.auxiliarService.getMisSolicitudes(filtro).subscribe({
      next: (data) => {
        this.solicitudes.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudieron cargar las solicitudes.');
        this.isLoading.set(false);
      }
    });
  }

  setFiltroEstado(e: EstadoFiltro): void {
    this.filtroEstado.set(e);
  }

  aplicarFechas(): void {
    this.load();
  }

  limpiarFechas(): void {
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.load();
  }

  // ── Resolver solicitud ──
  abrirResolver(s: Solicitud): void {
    this.resolvingId.set(s.id_solicitud);
    this.resolveNote.set('');
    this.submitError.set('');
    this.showResolveModal.set(true);
  }

  cerrarResolver(): void {
    if (this.isSubmitting()) return;
    this.showResolveModal.set(false);
    this.resolvingId.set(null);
  }

  confirmarResolucion(): void {
    const id = this.resolvingId();
    const nota = this.resolveNote().trim();
    if (!id) return;
    if (!nota) {
      this.submitError.set('La nota de resolución es obligatoria.');
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set('');
    this.auxiliarService.resolverSolicitud(id, nota).subscribe({
      next: (updated) => {
        // Actualiza la solicitud en la lista
        this.solicitudes.update(list =>
          list.map(s => (s.id_solicitud === id ? updated : s))
        );
        this.isSubmitting.set(false);
        this.showResolveModal.set(false);
        this.resolvingId.set(null);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.submitError.set(err?.error?.detail ?? 'No se pudo resolver la solicitud.');
      }
    });
  }

  // ── Helpers ──
  formatFecha(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('es-ES', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  }

  estadoLabel(e: string): string {
    const map: Record<string, string> = {
      pendiente:  'Pendiente',
      en_proceso: 'En proceso',
      resuelta:   'Resuelta'
    };
    return map[e] ?? e;
  }
}