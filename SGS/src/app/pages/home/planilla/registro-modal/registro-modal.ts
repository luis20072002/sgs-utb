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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { Aula } from '../../../../services/auxiliar.service';
import {
  RegistrosService,
  Registro,
  RegistroCreatePayload,
  RegistroUpdatePayload,
} from '../../../../services/registros.service';

/* ──────────────────────────────────────────────────────────────────────────
   Interfaz interna del formulario
   ────────────────────────────────────────────────────────────────────────── */
interface RegistroForm {
  asistencia:    boolean | null;
  audiovisuales: boolean | null;
  novedadDesc:   string;
  solicitudDesc: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   Evento que emite el modal al guardar exitosamente
   ────────────────────────────────────────────────────────────────────────── */
export interface RegistroGuardadoEvent {
  aula:     Aula;
  registro: Registro;
  /** true si fue una actualización, false si fue creación */
  esActualizacion: boolean;
}

/* ──────────────────────────────────────────────────────────────────────────
   Componente
   ────────────────────────────────────────────────────────────────────────── */
@Component({
  selector: 'app-registro-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registro-modal.html',
  styleUrls: ['./registro-modal.css'],
})
export class RegistroModalComponent implements OnChanges {

  /* ── Inputs ─────────────────────────────────────────────────────────── */

  /** Controla la visibilidad del overlay */
  @Input() open = false;

  /** Aula sobre la que se está registrando */
  @Input() aula: Aula | null = null;

  /** ID de la planilla activa del auxiliar */
  @Input() idPlanilla: number | null = null;

  /* ── Outputs ────────────────────────────────────────────────────────── */

  /** Emite cuando el registro se guardó correctamente */
  @Output() guardado = new EventEmitter<RegistroGuardadoEvent>();

  /** Emite cuando el usuario cancela o cierra el modal */
  @Output() cancelado = new EventEmitter<void>();

  /* ── Estado interno ─────────────────────────────────────────────────── */

  isLoading      = signal(false);   // cargando registro existente
  isSubmitting   = signal(false);   // guardando
  errorMsg       = signal('');

  registroExistente = signal<Registro | null>(null);

  showNovedad   = signal(false);
  showSolicitud = signal(false);

  form: RegistroForm = {
    asistencia:    null,
    audiovisuales: null,
    novedadDesc:   '',
    solicitudDesc: '',
  };

  /* ── Computed ───────────────────────────────────────────────────────── */

  /**
   * El formulario es válido cuando tanto asistencia como audiovisuales
   * tienen un valor (true o false, no null).
   */
  isFormValid = computed(() =>
    this.form.asistencia !== null && this.form.audiovisuales !== null
  );

  constructor(private registrosService: RegistrosService) {}

  /* ── Lifecycle ──────────────────────────────────────────────────────── */

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        this.initModal();
      } else {
        this.resetModal();
      }
    }
  }

  /* ── Inicialización ─────────────────────────────────────────────────── */

  private initModal(): void {
    this.resetModal();

    if (!this.aula || !this.idPlanilla) return;

    this.isLoading.set(true);

    this.registrosService
      .getRegistroPorAula(this.idPlanilla, this.aula.id_aula)
      .pipe(catchError(() => of(null)))
      .subscribe((registro) => {
        if (registro) {
          // Hay un registro previo → modo edición
          this.registroExistente.set(registro);
          this.form.asistencia    = registro.asistencia_docente;
          this.form.audiovisuales = registro.uso_audiovisuales;
          // Novedades y solicitudes existentes no se cargan para edición
          // (son inmutables una vez creadas; el auxiliar solo puede agregar nuevas)
        }
        this.isLoading.set(false);
      });
  }

  private resetModal(): void {
    this.form = {
      asistencia:    null,
      audiovisuales: null,
      novedadDesc:   '',
      solicitudDesc: '',
    };
    this.registroExistente.set(null);
    this.showNovedad.set(false);
    this.showSolicitud.set(false);
    this.errorMsg.set('');
    this.isSubmitting.set(false);
    this.isLoading.set(false);
  }

  /* ── Toggles de secciones opcionales ───────────────────────────────── */

  toggleNovedad(): void {
    this.showNovedad.update((v) => !v);
    if (!this.showNovedad()) this.form.novedadDesc = '';
  }

  toggleSolicitud(): void {
    this.showSolicitud.update((v) => !v);
    if (!this.showSolicitud()) this.form.solicitudDesc = '';
  }

  /* ── Acciones del modal ─────────────────────────────────────────────── */

  onOverlayClick(): void {
    if (!this.isSubmitting()) this.onCancel();
  }

  onCancel(): void {
    if (this.isSubmitting()) return;
    this.cancelado.emit();
  }

  onSubmit(): void {
    if (!this.isFormValid() || this.isSubmitting()) return;
    if (!this.aula || !this.idPlanilla) return;

    this.isSubmitting.set(true);
    this.errorMsg.set('');

    const registro = this.registroExistente();

    if (registro) {
      this.actualizarRegistro(registro);
    } else {
      this.crearRegistro();
    }
  }

  /* ── Flujo de CREACIÓN ──────────────────────────────────────────────── */

  private crearRegistro(): void {
    const payload: RegistroCreatePayload = {
      id_planilla:        this.idPlanilla!,
      id_aula:            this.aula!.id_aula,
      asistencia_docente: this.form.asistencia!,
      uso_audiovisuales:  this.form.audiovisuales!,
    };

    this.registrosService
      .crear(payload)
      .pipe(
        catchError((err) => {
          const msg = err?.error?.detail ?? 'No se pudo guardar el registro. Intenta de nuevo.';
          this.errorMsg.set(msg);
          this.isSubmitting.set(false);
          return of(null);
        }),
        switchMap((registro) => {
          if (!registro) return of(null);

          // Crear novedad y/o solicitud en paralelo si corresponde
          const novedad$ =
            this.showNovedad() && this.form.novedadDesc.trim()
              ? this.registrosService
                  .crearNovedad({ id_registro: registro.id_registro, descripcion: this.form.novedadDesc.trim() })
                  .pipe(catchError(() => of(null)))
              : of(null);

          const solicitud$ =
            this.showSolicitud() && this.form.solicitudDesc.trim()
              ? this.registrosService
                  .crearSolicitud({ id_registro: registro.id_registro, descripcion: this.form.solicitudDesc.trim() })
                  .pipe(catchError(() => of(null)))
              : of(null);

          return forkJoin({ novedad: novedad$, solicitud: solicitud$ }).pipe(
            // Aunque fallen las novedades/solicitudes, el registro ya quedó guardado
            catchError(() => of({ novedad: null, solicitud: null })),
            // Retornamos el registro para el evento
            switchMap(() => of(registro))
          );
        })
      )
      .subscribe((registro) => {
        if (!registro) return; // ya manejado en catchError
        this.isSubmitting.set(false);
        this.guardado.emit({
          aula:            this.aula!,
          registro,
          esActualizacion: false,
        });
      });
  }

  /* ── Flujo de ACTUALIZACIÓN ─────────────────────────────────────────── */

  private actualizarRegistro(registroExistente: Registro): void {
    const payload: RegistroUpdatePayload = {
      asistencia_docente: this.form.asistencia!,
      uso_audiovisuales:  this.form.audiovisuales!,
    };

    this.registrosService
      .actualizar(registroExistente.id_registro, payload)
      .pipe(
        catchError((err) => {
          const msg = err?.error?.detail ?? 'No se pudo actualizar el registro. Intenta de nuevo.';
          this.errorMsg.set(msg);
          this.isSubmitting.set(false);
          return of(null);
        })
      )
      .subscribe((registro) => {
        if (!registro) return;
        this.isSubmitting.set(false);
        this.guardado.emit({
          aula:            this.aula!,
          registro,
          esActualizacion: true,
        });
      });
  }
}