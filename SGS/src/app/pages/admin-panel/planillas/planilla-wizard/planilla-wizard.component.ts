// src/app/pages/admin-panel/planillas/planilla-wizard/planilla-wizard.component.ts
import {
  Component, Input, Output, EventEmitter, signal, computed,
  ChangeDetectionStrategy, inject, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';

import { PlanillasService } from '../../../../services/planillas.service';
import { AdminService } from '../../../../services/admin.service';
import { Planilla, PlanillaCreate, HorarioClaseCreate } from '../../../../../models/planilla.model';
import { DocentesService } from '../../../../services/docentes.service';
import { UserService } from '../../../../services/user.service';
import { EdificiosService } from '../../../../services/edificios.service';


interface ClaseForm {
  id_aula: number;
  id_docente: number;
  id_curso: number;
  hora_inicio: string;
  hora_fin: string;
  dia_semana: number | null;
}

interface AulaConClases {
  aula: any;
  clases: ClaseForm[];
}

@Component({
  selector: 'app-planilla-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './planilla-wizard.component.html',
  styleUrl: './planilla-wizard.component.css'
})
export class PlanillaWizardComponent implements OnInit {
  @Input() edificios: any[] = [];
  @Input() turnos: any[] = [];
  @Input() auxiliares: any[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() creado = new EventEmitter<Planilla>();


  private docentesService = inject(DocentesService);
  private userService = inject(UserService);
  private edificiosService = inject(EdificiosService);
  private planillasService = inject(PlanillasService);
  private adminService = inject(AdminService);

  pasos = [
    { num: 1, label: 'Datos básicos' },
    { num: 2, label: 'Selección de aulas' },
    { num: 3, label: 'Clases por aula' },
  ];

  readonly diasSemana = [
    { num: 1, nombre: 'Lun' }, { num: 2, nombre: 'Mar' },
    { num: 3, nombre: 'Mié' }, { num: 4, nombre: 'Jue' },
    { num: 5, nombre: 'Vie' }, { num: 6, nombre: 'Sáb' },
    { num: 7, nombre: 'Dom' },
  ];

  pasoActual = signal(1);
  guardando = signal(false);
  cargandoAulas = signal(false);
  errorPaso1 = signal('');
  errorPaso2 = signal('');
  errorPaso3 = signal('');

  docentes = signal<any[]>([]);
  cursos = signal<any[]>([]);
  aulasDisponibles = signal<any[]>([]);
  aulasSeleccionadas = signal<any[]>([]);
  pisosSeleccionados = signal<number[]>([]);
  aulaTabActiva = signal<number>(0);
  aulasConClases = signal<AulaConClases[]>([]);

  form = {
    id_usuario: '' as any,
    id_edificio: '' as any,
    id_turno: '' as any,
    periodo_vigencia: '',
    fecha_asignacion: new Date().toISOString().split('T')[0],
  };

  edificioSeleccionado = computed(() =>
    this.edificios.find(e => String(e.id_edificio) === String(this.form.id_edificio)) ?? null
  );

  turnoSeleccionado = computed(() =>
    this.turnos.find(t => String(t.id_turno) === String(this.form.id_turno)) ?? null
  );

  auxiliarEdificio = computed(() => {
    const aux = this.auxiliares.find(a => String(a.id_usuario) === String(this.form.id_usuario));
    return aux?.id_edificio ?? null;
  });

  pisosDisponibles = computed(() => {
    const ed = this.edificioSeleccionado();
    if (!ed) return [];
    return Array.from({ length: ed.cantidad_pisos }, (_, i) => i + 1);
  });

  aulasPorPiso = computed(() => {
    const pisos = this.pisosSeleccionados();
    const aulas = this.aulasDisponibles();
    return pisos.map(p => ({
      piso: p,
      aulas: aulas.filter(a => a.piso === p),
    }));
  });

  pisosTexto = computed(() => this.pisosSeleccionados().map(p => `Piso ${p}`).join(', '));

  ngOnInit() {
    this.docentesService.list().subscribe({ next: (d: any[]) => this.docentes.set(d) });
    this.userService.getCursos().subscribe({ next: (c: any[]) => this.cursos.set(c) });
  }

  onAuxiliarChange() {
    const edificioId = this.auxiliarEdificio();
    if (edificioId) {
      this.form.id_edificio = edificioId;
      this.onEdificioChange();
    }
  }

  onEdificioChange() {
    this.pisosSeleccionados.set([]);
    this.aulasSeleccionadas.set([]);
    this.aulasDisponibles.set([]);
    if (!this.form.id_edificio) return;
    this.cargandoAulas.set(true);
    
    this.edificiosService.listAulasPorEdificio(+this.form.id_edificio).subscribe({
      next: (aulas: any[]) => { 
        this.aulasDisponibles.set(aulas);
        this.cargandoAulas.set(false);
      },
      error: () => this.cargandoAulas.set(false),
    });
  }

  isPisoSeleccionado(p: number): boolean {
    return this.pisosSeleccionados().includes(p);
  }

  togglePiso(p: number) {
    const current = this.pisosSeleccionados();
    if (current.includes(p)) {
      this.pisosSeleccionados.set(current.filter(x => x !== p));
    } else if (current.length < 3) {
      this.pisosSeleccionados.set([...current, p].sort((a, b) => a - b));
    }
  }

  isAulaSeleccionada(id: number): boolean {
    return this.aulasSeleccionadas().some(a => a.id_aula === id);
  }

  toggleAula(aula: any) {
    const current = this.aulasSeleccionadas();
    if (this.isAulaSeleccionada(aula.id_aula)) {
      this.aulasSeleccionadas.set(current.filter(a => a.id_aula !== aula.id_aula));
    } else {
      this.aulasSeleccionadas.set([...current, aula]);
    }
  }

  getNombreEdificio(id: number): string {
    return this.edificios.find(e => e.id_edificio === id)?.nombre ?? `Edif. ${id}`;
  }

  avanzar() {
    if (this.pasoActual() === 1) {
      if (!this.validarPaso1()) return;
      this.pasoActual.set(2);
    } else if (this.pasoActual() === 2) {
      if (!this.validarPaso2()) return;
      this.inicializarClases();
      this.pasoActual.set(3);
    }
  }

  retroceder() {
    this.pasoActual.set(this.pasoActual() - 1);
  }

  validarPaso1(): boolean {
    this.errorPaso1.set('');
    if (!this.form.id_usuario) { this.errorPaso1.set('Selecciona un auxiliar.'); return false; }
    if (!this.form.id_edificio) { this.errorPaso1.set('Selecciona un edificio.'); return false; }
    if (!this.form.id_turno) { this.errorPaso1.set('Selecciona un turno.'); return false; }
    if (!this.form.periodo_vigencia || !/^\d{6}$/.test(this.form.periodo_vigencia)) {
      this.errorPaso1.set('El período debe tener formato YYYYSS (6 dígitos). Ej: 202501'); return false;
    }
    if (!this.form.fecha_asignacion) { this.errorPaso1.set('Ingresa la fecha de asignación.'); return false; }
    if (this.pisosSeleccionados().length === 0) { this.errorPaso1.set('Selecciona al menos un piso.'); return false; }
    return true;
  }

  validarPaso2(): boolean {
    this.errorPaso2.set('');
    if (this.aulasSeleccionadas().length === 0) {
      this.errorPaso2.set('Selecciona al menos un aula.'); return false;
    }
    return true;
  }

  inicializarClases() {
    const aulas = this.aulasSeleccionadas();
    const current = this.aulasConClases();
    const nuevas = aulas.map(aula => {
      const existe = current.find(ac => ac.aula.id_aula === aula.id_aula);
      return existe ?? { aula, clases: [] };
    });
    this.aulasConClases.set(nuevas);
    if (nuevas.length > 0 && this.aulaTabActiva() === 0) {
      this.aulaTabActiva.set(nuevas[0].aula.id_aula);
    }
  }

  agregarClase(ac: AulaConClases) {
    const turno = this.turnoSeleccionado();
    ac.clases.push({
      id_aula: ac.aula.id_aula,
      id_docente: '' as any,
      id_curso: '' as any,
      hora_inicio: turno?.hora_inicio ?? '07:00',
      hora_fin: turno?.hora_fin ?? '09:00',
      dia_semana: null,
    });
    // Forzar detección de cambio
    this.aulasConClases.set([...this.aulasConClases()]);
  }

  quitarClase(ac: AulaConClases, idx: number) {
    ac.clases.splice(idx, 1);
    this.aulasConClases.set([...this.aulasConClases()]);
  }

  validarPaso3(): boolean {
    this.errorPaso3.set('');
    const turno = this.turnoSeleccionado();
    if (!turno) { this.errorPaso3.set('Error: turno no encontrado.'); return false; }

    for (const ac of this.aulasConClases()) {
      for (const clase of ac.clases) {
        if (!clase.id_docente || !clase.id_curso) {
          this.errorPaso3.set(`Completa docente y curso en todas las clases del aula ${ac.aula.codigo}.`);
          this.aulaTabActiva.set(ac.aula.id_aula);
          return false;
        }
        if (clase.hora_inicio >= clase.hora_fin) {
          this.errorPaso3.set(`Hora fin debe ser mayor que hora inicio en el aula ${ac.aula.codigo}.`);
          this.aulaTabActiva.set(ac.aula.id_aula);
          return false;
        }
        if (clase.hora_inicio < turno.hora_inicio || clase.hora_fin > turno.hora_fin) {
          this.errorPaso3.set(
            `Las horas en ${ac.aula.codigo} deben estar dentro del turno (${turno.hora_inicio} – ${turno.hora_fin}).`
          );
          this.aulaTabActiva.set(ac.aula.id_aula);
          return false;
        }
      }
    }
    return true;
  }

  async guardar() {
    if (!this.validarPaso3()) return;
    this.guardando.set(true);

    const pisos = this.pisosSeleccionados();
    const payload: PlanillaCreate = {
      id_usuario: +this.form.id_usuario,
      id_turno: +this.form.id_turno,
      id_edificio: +this.form.id_edificio,
      piso_1: pisos[0],
      piso_2: pisos[1] ?? null,
      piso_3: pisos[2] ?? null,
      periodo_vigencia: this.form.periodo_vigencia,
      fecha_asignacion: this.form.fecha_asignacion,
    };

    this.planillasService.crearPlanilla(payload).subscribe({
      next: (planilla) => {
        const clases: HorarioClaseCreate[] = this.aulasConClases().flatMap(ac =>
          ac.clases.map(c => ({
            id_planilla: planilla.id_planillas,
            id_aula: ac.aula.id_aula,
            id_docente: +c.id_docente,
            id_curso: +c.id_curso,
            hora_inicio: c.hora_inicio,
            hora_fin: c.hora_fin,
            dia_semana: c.dia_semana,
          }))
        );

        // Crear clases secuencialmente
        const crearClases = (idx: number) => {
          if (idx >= clases.length) {
            this.guardando.set(false);
            this.creado.emit(planilla);
            return;
          }
          this.planillasService.crearClase(clases[idx]).subscribe({
            next: () => crearClases(idx + 1),
            error: () => crearClases(idx + 1), // continúa aunque falle alguna
          });
        };
        crearClases(0);
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorPaso3.set(err.error?.detail ?? 'Error al crear la planilla.');
      },
    });
  }

  // XLSX Carga masiva
  cargarXLSX(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      const turno = this.turnoSeleccionado();
      const current = this.aulasConClases();

      for (const row of rows) {
        const codigoAula = String(row['codigo_aula'] ?? '').toUpperCase();
        const ac = current.find(a => a.aula.codigo === codigoAula);
        if (!ac) continue;

        ac.clases.push({
          id_aula: ac.aula.id_aula,
          id_docente: +row['id_docente'] || 0,
          id_curso: +row['id_curso'] || 0,
          hora_inicio: String(row['hora_inicio'] ?? turno?.hora_inicio ?? '07:00'),
          hora_fin: String(row['hora_fin'] ?? turno?.hora_fin ?? '09:00'),
          dia_semana: row['dia_semana'] ? +row['dia_semana'] : null,
        });
      }
      this.aulasConClases.set([...current]);
    };
    reader.readAsArrayBuffer(file);
  }

  descargarPlantilla() {
    const aulas = this.aulasSeleccionadas();
    const data = aulas.map(a => ({
      codigo_aula: a.codigo,
      id_docente: '',
      id_curso: '',
      hora_inicio: '',
      hora_fin: '',
      dia_semana: '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clases');
    XLSX.writeFile(wb, 'plantilla_clases.xlsx');
  }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('wizard-overlay')) {
      this.cerrar.emit();
    }
  }
}