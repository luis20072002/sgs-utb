// src/app/pages/home/planilla/registro-modal/registro-modal.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { Aula } from '../../../../services/auxiliar.service';
import {
  RegistrosService,
  Registro,
  RegistroCreatePayload,
  RegistroUpdatePayload,
} from '../../../../services/registros.service';
import { environment } from '../../../../../environments/environment';

interface HorarioClase {
  id_horario_clase: number;
  id_planilla:      number;
  id_aula:          number;
  id_docente:       number;
  id_curso:         number;
  hora_inicio:      string;
  hora_fin:         string;
  dia_semana:       number | null;
}

export interface RegistroGuardadoEvent {
  aula:            Aula;
  registro:        Registro;
  esActualizacion: boolean;
}

@Component({
  selector: 'app-registro-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registro-modal.html',
  styleUrls: ['./registro-modal.css'],
})
export class RegistroModalComponent implements OnChanges {

  @Input() open        = false;
  @Input() aula:        Aula | null = null;
  @Input() idPlanilla:  number | null = null;
  @Input() idTurno:     number | null = null;

  @Output() guardado  = new EventEmitter<RegistroGuardadoEvent>();
  @Output() cancelado = new EventEmitter<void>();

  private registrosService = inject(RegistrosService);
  private http             = inject(HttpClient);
  private base             = environment.apiUrl;

  isLoading    = signal(false);
  isSubmitting = signal(false);
  errorMsg     = signal('');

  registroExistente = signal<Registro | null>(null);
  horarioClase      = signal<HorarioClase | null>(null);

  showNovedad   = signal(false);
  showSolicitud = signal(false);

  asistencia    = signal<boolean | null>(null);
  audiovisuales = signal<boolean | null>(null);

  novedadDesc   = '';
  solicitudDesc = '';

  isFormValid = computed(() =>
    this.asistencia() !== null && this.audiovisuales() !== null
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) this.initModal();
      else           this.resetModal();
    }
  }

  private initModal(): void {
    this.resetModal();
    if (!this.aula || !this.idPlanilla) return;

    this.isLoading.set(true);

    forkJoin({
      clases:    this.http.get<HorarioClase[]>(
                   `${this.base}/horarios-clase/planilla/${this.idPlanilla}`
                 ).pipe(catchError(() => of([] as HorarioClase[]))),
      registros: this.registrosService.getMisRegistros()
                   .pipe(catchError(() => of([] as Registro[]))),
    }).subscribe(({ clases, registros }) => {
      const clase = clases.find(c => c.id_aula === this.aula!.id_aula) ?? null;
      this.horarioClase.set(clase);

      const registroExistente = registros.find(
        r => r.id_aula === this.aula!.id_aula && r.id_turno === this.idTurno
      ) ?? null;

      if (registroExistente) {
        this.registroExistente.set(registroExistente);
        this.asistencia.set(registroExistente.asistencia_docente);
        this.audiovisuales.set(registroExistente.uso_medios_audiovisuales);
      }

      this.isLoading.set(false);
    });
  }

  private resetModal(): void {
    this.asistencia.set(null);
    this.audiovisuales.set(null);
    this.novedadDesc   = '';
    this.solicitudDesc = '';
    this.registroExistente.set(null);
    this.horarioClase.set(null);
    this.showNovedad.set(false);
    this.showSolicitud.set(false);
    this.errorMsg.set('');
    this.isSubmitting.set(false);
    this.isLoading.set(false);
  }

  private fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  private horaAhora(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  }

  toggleNovedad(): void {
    this.showNovedad.update(v => !v);
    if (!this.showNovedad()) this.novedadDesc = '';
  }

  toggleSolicitud(): void {
    this.showSolicitud.update(v => !v);
    if (!this.showSolicitud()) this.solicitudDesc = '';
  }

  onOverlayClick(): void { if (!this.isSubmitting()) this.onCancel(); }
  onCancel(): void       { if (!this.isSubmitting()) this.cancelado.emit(); }

  onSubmit(): void {
    if (!this.isFormValid() || this.isSubmitting()) return;

    const clase = this.horarioClase();
    if (!clase) {
      this.errorMsg.set('Este aula no tiene una clase asignada en la planilla. Contacta al administrador.');
      return;
    }
    if (!this.idTurno) {
      this.errorMsg.set('Faltan datos del turno. Intenta recargar la página.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set('');

    const registro = this.registroExistente();
    if (registro) this.actualizarRegistro(registro, clase);
    else          this.crearRegistro(clase);
  }

  private crearRegistro(clase: HorarioClase): void {
    const payload: RegistroCreatePayload = {
      id_turno:                 this.idTurno!,
      id_aula:                  this.aula!.id_aula,
      id_docente:               clase.id_docente,
      id_curso:                 clase.id_curso,
      asistencia_docente:       this.asistencia()!,
      uso_medios_audiovisuales: this.audiovisuales()!,
      fecha_registro:           this.fechaHoy(),
      hora_registro:            this.horaAhora(),
    };

    this.registrosService.crear(payload).pipe(
      catchError((err) => {
        this.errorMsg.set(this.parseError(err, 'No se pudo guardar el registro.'));
        this.isSubmitting.set(false);
        return of(null);
      }),
      switchMap((registro) => {
        if (!registro) return of(null);

        const novedad$ = this.showNovedad() && this.novedadDesc.trim()
          ? this.registrosService.crearNovedad({ id_registro: registro.id_registro, descripcion: this.novedadDesc.trim() })
              .pipe(catchError(() => of(null)))
          : of(null);

        const solicitud$ = this.showSolicitud() && this.solicitudDesc.trim()
          ? this.registrosService.crearSolicitud({ id_registro: registro.id_registro, descripcion: this.solicitudDesc.trim() })
              .pipe(catchError(() => of(null)))
          : of(null);

        return forkJoin({ novedad: novedad$, solicitud: solicitud$ }).pipe(
          catchError(() => of(null)),
          switchMap(() => of(registro))
        );
      })
    ).subscribe((registro) => {
      if (!registro) return;
      this.isSubmitting.set(false);
      this.guardado.emit({ aula: this.aula!, registro, esActualizacion: false });
    });
  }

  private actualizarRegistro(registroExistente: Registro, clase: HorarioClase): void {
    const payload: RegistroUpdatePayload = {
      id_turno:                 registroExistente.id_turno,
      id_aula:                  registroExistente.id_aula,
      id_docente:               clase.id_docente,
      id_curso:                 clase.id_curso,
      asistencia_docente:       this.asistencia()!,
      uso_medios_audiovisuales: this.audiovisuales()!,
      fecha_registro:           registroExistente.fecha_registro,
      hora_registro:            registroExistente.hora_registro,
    };

    this.registrosService.actualizar(registroExistente.id_registro, payload).pipe(
      catchError((err) => {
        this.errorMsg.set(this.parseError(err, 'No se pudo actualizar el registro.'));
        this.isSubmitting.set(false);
        return of(null);
      })
    ).subscribe((registro) => {
      if (!registro) return;
      this.isSubmitting.set(false);
      this.guardado.emit({ aula: this.aula!, registro, esActualizacion: true });
    });
  }

  private parseError(err: any, fallback: string): string {
    const detail = err?.error?.detail;
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((e: any) => e?.msg ?? JSON.stringify(e)).join(' · ');
    }
    return fallback;
  }
}