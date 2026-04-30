// src/app/pages/admin-panel/planillas/planillas.component.ts
import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { PlanillasService } from '../../../services/planillas.service';
import { AdminService } from '../../../services/admin.service';
import { Planilla, PlanillaEnriquecida } from '../../../../models/planilla.model';
import { PlanillaWizardComponent } from './planilla-wizard/planilla-wizard.component';
import { PlanillaDetalleComponent } from './planilla-detalle/planilla-detalle.component';
import { EdificiosService } from '../../../services/edificios.service';
import { UserService } from '../../../services/user.service';
import { TurnosService } from '../../../services/turnos.service';


@Component({
  selector: 'app-planillas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, PlanillaWizardComponent, PlanillaDetalleComponent],
  templateUrl: './planillas.component.html',
  styleUrl: './planillas.component.css'
})
export class PlanillasComponent implements OnInit {
  protected Math = Math;
  private edificiosService = inject(EdificiosService);
  private userService = inject(UserService);
  private turnosService = inject(TurnosService);
  private planillasService = inject(PlanillasService);
  private adminService = inject(AdminService);

  // Estado
  planillas = signal<Planilla[]>([]);
  edificios = signal<any[]>([]);
  turnos = signal<any[]>([]);
  auxiliares = signal<any[]>([]);
  cargando = signal(true);
  mostrarWizard = signal(false);
  planillaSeleccionada = signal<Planilla | null>(null);
  planillaAEliminar = signal<Planilla | null>(null);
  eliminando = signal(false);

  // Filtros
  filtroEdificio = '';
  filtroTurno = '';
  filtroPeriodo = '';
  filtroEstado = '';

  // Paginación
  paginaActual = signal(1);
  readonly porPagina = 10;

  // Computed
  planillasFiltradas = computed(() => {
    let lista = this.planillas();
    if (this.filtroEdificio) lista = lista.filter(p => String(p.id_edificio) === String(this.filtroEdificio));
    if (this.filtroTurno) lista = lista.filter(p => String(p.id_turno) === String(this.filtroTurno));
    if (this.filtroPeriodo) lista = lista.filter(p => p.periodo_vigencia.includes(this.filtroPeriodo));
    if (this.filtroEstado) lista = lista.filter(p => p.estado === this.filtroEstado);
    return lista;
  });

  planillasEnPagina = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.porPagina;
    return this.planillasFiltradas().slice(inicio, inicio + this.porPagina);
  });

  totalPaginas = computed(() => Math.ceil(this.planillasFiltradas().length / this.porPagina));

  totalActivas = computed(() => this.planillasFiltradas().filter(p => p.estado === 'activa').length);
  totalInactivas = computed(() => this.planillasFiltradas().filter(p => p.estado === 'inactiva').length);

  paginasVisibles = computed(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    const paginas: number[] = [];
    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    return paginas;
  });

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando.set(true);
    Promise.all([
      this.planillasService.getPlanillas().toPromise(),
      this.edificiosService.listEdificios().toPromise(), // Llamado correcto a EdificiosService
      this.turnosService.list().toPromise(),        // Llamado a TurnosService
      this.userService.getUsuarios().toPromise()         // Llamado correcto a UserService
    ]).then(([planillas, edificios, turnos, usuarios]) => {
      this.planillas.set(planillas || []);
      this.edificios.set(edificios || []);
      this.turnos.set(turnos || []);
      // Solo auxiliares (rol_id 2)
      this.auxiliares.set((usuarios || []).filter((u: any) => u.rol?.rol_id === 2 || u.rol_id === 2));
      this.cargando.set(false);
    }).catch(() => {
      this.cargando.set(false);
    });
  }

  aplicarFiltros() {
    this.paginaActual.set(1);
  }

  limpiarFiltros() {
    this.filtroEdificio = '';
    this.filtroTurno = '';
    this.filtroPeriodo = '';
    this.filtroEstado = '';
    this.paginaActual.set(1);
  }

  cambiarPagina(p: number) {
    this.paginaActual.set(p);
  }

  // Helpers lookup
  getNombreEdificio(id: number): string {
    return this.edificios().find(e => e.id_edificio === id)?.nombre ?? `Edif. ${id}`;
  }

  getNombreTurno(id: number): string {
    return this.turnos().find(t => t.id_turno === id)?.nombre_turno ?? `Turno ${id}`;
  }

  getNombreAuxiliar(id: number): string {
    return this.auxiliares().find(u => u.id_usuario === id)?.nombre ?? `Usuario ${id}`;
  }

  // Acciones
  abrirWizard() { this.mostrarWizard.set(true); }
  cerrarWizard() { this.mostrarWizard.set(false); }

  onPlanillaCreada(planilla: Planilla) {
    this.cerrarWizard();
    this.cargarDatos();
  }

  verDetalle(p: Planilla) { this.planillaSeleccionada.set(p); }
  cerrarDetalle() { this.planillaSeleccionada.set(null); }

  toggleEstado(p: Planilla) {
    const nuevoEstado = p.estado === 'activa' ? 'inactiva' : 'activa';
    this.planillasService.cambiarEstado(p.id_planillas, nuevoEstado).subscribe({
      next: () => this.cargarDatos(),
    });
  }

  confirmarEliminar(p: Planilla) { this.planillaAEliminar.set(p); }
  cancelarEliminar() { this.planillaAEliminar.set(null); }

  ejecutarEliminar() {
    const p = this.planillaAEliminar();
    if (!p) return;
    this.eliminando.set(true);
    this.planillasService.eliminarPlanilla(p.id_planillas).subscribe({
      next: () => {
        this.planillaAEliminar.set(null);
        this.eliminando.set(false);
        this.cargarDatos();
      },
      error: () => {
        this.eliminando.set(false);
      }
    });
  }
}