// src/app/pages/admin-panel/planillas/planilla-detalle/planilla-detalle.component.ts
import {
  Component, Input, Output, EventEmitter, OnInit, signal, inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PlanillasService } from '../../../../services/planillas.service';
import { EdificiosService } from '../../../../services/edificios.service';
import { DocentesService } from '../../../../services/docentes.service';
import { UserService } from '../../../../services/user.service';
import { AdminService } from '../../../../services/admin.service';
import { Planilla, HorarioClase, HorarioClaseCreate } from '../../../../../models/planilla.model';

interface AulaConClases {
  aula: any;
  clases: HorarioClase[];
}

@Component({
  selector: 'app-planilla-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './planilla-detalle.html',
  styleUrl: './planilla-detalle.component.css'

})
export class PlanillaDetalleComponent implements OnInit {
  @Input({ required: true }) planilla!: Planilla;
  @Input() edificios: any[] = [];
  @Input() turnos: any[] = [];
  @Input() auxiliares: any[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() actualizado = new EventEmitter<void>();

  private planillasService = inject(PlanillasService);
  private edificiosService = inject(EdificiosService);
  private docentesService = inject(DocentesService);
  private userService = inject(UserService);
  private adminService = inject(AdminService);

  readonly diasSemana = [
    { num: 1, nombre: 'Lun' }, { num: 2, nombre: 'Mar' },
    { num: 3, nombre: 'Mié' }, { num: 4, nombre: 'Jue' },
    { num: 5, nombre: 'Vie' }, { num: 6, nombre: 'Sáb' },
    { num: 7, nombre: 'Dom' },
  ];

  cargando = signal(true);
  clases = signal<HorarioClase[]>([]);
  aulasEdificio = signal<any[]>([]);
  docentes = signal<any[]>([]);
  cursos = signal<any[]>([]);
  aulasConClases = signal<AulaConClases[]>([]);
  mostrarFormNuevaClase = signal(false);
  guardandoClase = signal(false);
  errorNuevaClase = signal('');

  nuevaClase = {
    id_aula: '' as any,
    id_docente: '' as any,
    id_curso: '' as any,
    hora_inicio: '',
    hora_fin: '',
    dia_semana: null as number | null,
  };

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando.set(true);
    Promise.all([
      this.planillasService.getClasesPorPlanilla(this.planilla.id_planillas).toPromise(),
      this.edificiosService.listAulasPorEdificio(this.planilla.id_edificio).toPromise(),
      this.docentesService.list().toPromise(),
      this.userService.getCursos().toPromise(),
    ]).then(([clases, aulas, docentes, cursos]) => {
      this.clases.set(clases || []);
      this.aulasEdificio.set(aulas || []);
      this.docentes.set(docentes || []);
      this.cursos.set(cursos || []);
      this.agruparClases(clases || [], aulas || []);
      this.cargando.set(false);
    });
  }

  agruparClases(clases: HorarioClase[], aulas: any[]) {
    const pisos = this.getPisos();
    const aulasEnPisos = aulas.filter(a => pisos.includes(a.piso));

    // Obtener aulas que tienen al menos una clase, más las que están en los pisos de la planilla
    const aulaIds = new Set([
      ...clases.map(c => c.id_aula),
      ...aulasEnPisos.map(a => a.id_aula),
    ]);

    const grupos: AulaConClases[] = Array.from(aulaIds).map(id => ({
      aula: aulas.find(a => a.id_aula === id),
      clases: clases.filter(c => c.id_aula === id),
    })).filter(g => g.aula); // solo las que tienen datos de aula

    this.aulasConClases.set(grupos);
  }

  getPisos(): number[] {
    return [this.planilla.piso_1, this.planilla.piso_2, this.planilla.piso_3]
      .filter((p): p is number => p !== null && p !== undefined);
  }

  // Lookups
  getNombreEdificio(id: number): string {
    return this.edificios.find(e => e.id_edificio === id)?.nombre ?? `Edif. ${id}`;
  }
  getNombreTurno(id: number): string {
    return this.turnos.find(t => t.id_turno === id)?.nombre_turno ?? `Turno ${id}`;
  }
  getNombreAuxiliar(id: number): string {
    return this.auxiliares.find(u => u.id_usuario === id)?.nombre ?? `Usuario ${id}`;
  }
  getNombreDocente(id: number): string {
    const d = this.docentes().find(x => x.id_docente === id);
    return d ? `${d.nombre} ${d.apellido}` : `Doc. ${id}`;
  }
  getNombreCurso(id: number): string {
    return this.cursos().find(c => c.id_curso === id)?.nombre_curso ?? `Curso ${id}`;
  }
  getDiaSemana(num: number | null): string {
    if (!num) return '-';
    return this.diasSemana.find(d => d.num === num)?.nombre ?? String(num);
  }

  guardarNuevaClase() {
    this.errorNuevaClase.set('');
    if (!this.nuevaClase.id_aula || !this.nuevaClase.id_docente || !this.nuevaClase.id_curso) {
      this.errorNuevaClase.set('Completa aula, docente y curso.'); return;
    }
    if (!this.nuevaClase.hora_inicio || !this.nuevaClase.hora_fin) {
      this.errorNuevaClase.set('Ingresa hora de inicio y fin.'); return;
    }
    if (this.nuevaClase.hora_inicio >= this.nuevaClase.hora_fin) {
      this.errorNuevaClase.set('La hora fin debe ser mayor que la hora inicio.'); return;
    }

    const payload: HorarioClaseCreate = {
      id_planilla: this.planilla.id_planillas,
      id_aula: +this.nuevaClase.id_aula,
      id_docente: +this.nuevaClase.id_docente,
      id_curso: +this.nuevaClase.id_curso,
      hora_inicio: this.nuevaClase.hora_inicio,
      hora_fin: this.nuevaClase.hora_fin,
      dia_semana: this.nuevaClase.dia_semana,
    };

    this.guardandoClase.set(true);
    this.planillasService.crearClase(payload).subscribe({
      next: () => {
        this.guardandoClase.set(false);
        this.mostrarFormNuevaClase.set(false);
        this.resetNuevaClase();
        this.cargarDatos();
        this.actualizado.emit();
      },
      error: (err) => {
        this.guardandoClase.set(false);
        this.errorNuevaClase.set(err.error?.detail ?? 'Error al guardar la clase.');
      },
    });
  }

  eliminarClase(clase: HorarioClase) {
    this.planillasService.eliminarClase(clase.id_horario_clase).subscribe({
      next: () => { this.cargarDatos(); this.actualizado.emit(); },
    });
  }

  toggleEstado() {
    const nuevo = this.planilla.estado === 'activa' ? 'inactiva' : 'activa';
    this.planillasService.cambiarEstado(this.planilla.id_planillas, nuevo).subscribe({
      next: () => { this.actualizado.emit(); this.cerrar.emit(); },
    });
  }

  resetNuevaClase() {
    this.nuevaClase = {
      id_aula: '', id_docente: '', id_curso: '',
      hora_inicio: '', hora_fin: '', dia_semana: null,
    };
  }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('detalle-overlay')) {
      this.cerrar.emit();
    }
  }
}