// src/app/pages/admin-panel/turnos/turnos.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog';
import { TurnosService, Turno, TurnoCreatePayload, TurnoUpdatePayload }
  from '../../../services/turnos.service';

/**
 * /admin/turnos
 *
 * RF: el sistema debe permitir al administrador crear, visualizar,
 * actualizar y eliminar turnos. Cada turno tiene: nombre, hora_inicio
 * y hora_fin. Los turnos son franjas globales fijas.
 *
 * Validaciones de negocio:
 *  - hora_fin > hora_inicio (también validado en backend)
 *  - el backend rechaza eliminar turnos con planillas activas asociadas
 */
@Component({
  selector: 'app-admin-turnos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: 'turnos.html',
  styleUrls: ['turnos.css'],
})
export class AdminTurnosComponent implements OnInit {
  private fb  = inject(FormBuilder);
  private svc = inject(TurnosService);

  // ── Estado ────────────────────────────────────────────────────
  turnos    = signal<Turno[]>([]);
  loading   = signal(true);
  errorMsg  = signal('');

  // Modal CRUD
  showFormModal = signal(false);
  editingTurno  = signal<Turno | null>(null);
  saving        = signal(false);
  saveError     = signal('');

  // Confirm dialog
  showDelete    = signal(false);
  turnoToDelete = signal<Turno | null>(null);
  deleting      = signal(false);
  deleteError   = signal('');

  form: FormGroup = this.fb.group(
    {
      nombre_turno: ['', [Validators.required, Validators.maxLength(50)]],
      hora_inicio:  ['', Validators.required],
      hora_fin:     ['', Validators.required],
    },
    { validators: this.horasValidas }
  );

  readonly modoEdicion = computed(() => this.editingTurno() !== null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.svc.list().subscribe({
      next: (data) => {
        this.turnos.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.detail || 'No se pudieron cargar los turnos');
        this.loading.set(false);
      }
    });
  }

  // ── Formato visual ───────────────────────────────────────────
  formatHora(h: string | undefined | null): string {
    if (!h) return '—';
    // backend devuelve 'HH:mm:ss' o 'HH:mm'; normalizamos
    return h.slice(0, 5);
  }

  duracion(t: Turno): string {
    if (!t.hora_inicio || !t.hora_fin) return '';
    const [hi, mi] = t.hora_inicio.split(':').map(Number);
    const [hf, mf] = t.hora_fin.split(':').map(Number);
    let mins = (hf * 60 + mf) - (hi * 60 + mi);
    if (mins < 0) mins += 24 * 60;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  // ── Validador custom: hora_fin > hora_inicio ─────────────────
  private horasValidas(group: FormGroup) {
    const hi = group.get('hora_inicio')?.value;
    const hf = group.get('hora_fin')?.value;
    if (!hi || !hf) return null;
    return hf > hi ? null : { rangoHoras: true };
  }

  // ── Modal CRUD ───────────────────────────────────────────────
  openCreate(): void {
    this.editingTurno.set(null);
    this.form.reset({ nombre_turno: '', hora_inicio: '', hora_fin: '' });
    this.saveError.set('');
    this.showFormModal.set(true);
  }

  openEdit(t: Turno): void {
    this.editingTurno.set(t);
    this.form.reset({
      nombre_turno: t.nombre_turno,
      hora_inicio:  this.formatHora(t.hora_inicio),
      hora_fin:     this.formatHora(t.hora_fin),
    });
    this.saveError.set('');
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    if (this.saving()) return;
    this.showFormModal.set(false);
  }

  fieldHasError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saveError.set('');

    const raw = this.form.value;
    // Normalizar a HH:mm:ss para el backend (el input type=time devuelve HH:mm)
    const payload: TurnoCreatePayload = {
      nombre_turno: raw.nombre_turno.trim(),
      hora_inicio:  raw.hora_inicio.length === 5 ? `${raw.hora_inicio}:00` : raw.hora_inicio,
      hora_fin:     raw.hora_fin.length === 5    ? `${raw.hora_fin}:00`    : raw.hora_fin,
    };

    const editing = this.editingTurno();
    const obs = editing
      ? this.svc.update(editing.id_turno, payload as TurnoUpdatePayload)
      : this.svc.create(payload);

    obs.subscribe({
      next: (turno) => {
        if (editing) {
          this.turnos.update(list =>
            list.map(t => t.id_turno === turno.id_turno ? turno : t)
          );
        } else {
          this.turnos.update(list => [...list, turno]);
        }
        this.saving.set(false);
        this.showFormModal.set(false);
      },
      error: (err) => {
        this.saveError.set(err?.error?.detail || 'No se pudo guardar el turno');
        this.saving.set(false);
      }
    });
  }

  // ── Eliminar ──────────────────────────────────────────────────
  requestDelete(t: Turno): void {
    this.turnoToDelete.set(t);
    this.deleteError.set('');
    this.showDelete.set(true);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.showDelete.set(false);
    this.turnoToDelete.set(null);
  }

  confirmDelete(): void {
    const t = this.turnoToDelete();
    if (!t) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.svc.remove(t.id_turno).subscribe({
      next: () => {
        this.turnos.update(list => list.filter(x => x.id_turno !== t.id_turno));
        this.deleting.set(false);
        this.showDelete.set(false);
        this.turnoToDelete.set(null);
      },
      error: (err) => {
        this.deleteError.set(err?.error?.detail || 'No se pudo eliminar');
        this.deleting.set(false);
      }
    });
  }
}
