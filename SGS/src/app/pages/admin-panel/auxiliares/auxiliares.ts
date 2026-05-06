// src/app/pages/admin-panel/auxiliares/auxiliares.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog';
import { environment } from '../../../../environments/environment';

// ─── Modelos locales ────────────────────────────────────────────────────────

export interface AuxiliarUsuario {
  id_usuario:  number;
  nombre:      string;
  correo:      string;
  estado:      boolean;
  id_edificio: number | null;
  rol: { rol_id: number; nombre_rol: string };
}

export interface Edificio {
  id_edificio:    number;
  nombre:         string;
  codigo:         string;
  cantidad_pisos: number;
  estado:         boolean;
}

export interface CreateAuxiliarPayload {
  nombre:  string;
  correo:  string;
  pwsd:    string;
  estado:  boolean;
  rol_id:  number;
}

// rol_id = 2 es "auxiliar" (según el backend)
const ROL_AUXILIAR = 2;

/**
 * /admin/auxiliares
 *
 * RF: el sistema debe permitir al administrador crear, visualizar,
 * actualizar y desactivar usuarios auxiliares.
 * La desactivación es lógica (estado: false).
 *
 * Funcionalidades:
 *  - Tabla paginada con búsqueda por nombre / correo
 *  - Chips de filtro: Todos / Activos / Inactivos
 *  - Modal de creación: nombre, correo, contraseña, edificio asignado
 *  - Modal de edición: nombre, correo, edificio asignado (sin cambiar contraseña)
 *  - Confirm dialog para activar / desactivar
 */
@Component({
  selector: 'app-admin-auxiliares',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: 'auxiliares.html',
  styleUrls: ['auxiliares.css'],
})
export class AdminAuxiliaresComponent implements OnInit {
  private fb   = inject(FormBuilder);
  private http = inject(HttpClient);

  private readonly base = environment.apiUrl;

  // ── Estado: auxiliares ──────────────────────────────────────────────────
  auxiliares = signal<AuxiliarUsuario[]>([]);
  loading    = signal(true);
  errorMsg   = signal('');

  // ── Estado: edificios (para el select del modal) ─────────────────────────
  edificios        = signal<Edificio[]>([]);
  loadingEdificios = signal(false);

  // ── Filtros ──────────────────────────────────────────────────────────────
  searchTerm   = signal('');
  filtroEstado = signal<'todos' | 'activos' | 'inactivos'>('todos');

  // ── Paginación ────────────────────────────────────────────────────────────
  pageSize  = 10;
  pageIndex = signal(0);

  readonly filteredAll = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const f    = this.filtroEstado();
    return this.auxiliares().filter(a => {
      if (f === 'activos'   && !a.estado) return false;
      if (f === 'inactivos' &&  a.estado) return false;
      if (term) {
        const hay = `${a.nombre} ${a.correo}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredAll().length / this.pageSize))
  );

  readonly pagedRows = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.filteredAll().slice(start, start + this.pageSize);
  });

  // ── Modal CRUD ────────────────────────────────────────────────────────────
  showFormModal = signal(false);
  editing       = signal<AuxiliarUsuario | null>(null);
  saving        = signal(false);
  saveError     = signal('');

  /** El password solo se pide al crear, no al editar */
  form: FormGroup = this.fb.group({
    nombre:         ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    correo:         ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    pwsd:           ['', [Validators.minLength(6), Validators.maxLength(60)]],
    id_edificio:    [null as number | null],
  });

  // ── Toggle estado ─────────────────────────────────────────────────────────
  showToggleDialog = signal(false);
  toggleTarget     = signal<AuxiliarUsuario | null>(null);
  toggling         = signal(false);
  toggleError      = signal('');

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.cargar();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Carga de datos
  // ═══════════════════════════════════════════════════════════════════════════

  cargar(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    forkJoin({
      usuarios:  this.http.get<AuxiliarUsuario[]>(`${this.base}/usuarios/`).pipe(catchError(() => of([]))),
      edificios: this.http.get<Edificio[]>(`${this.base}/edificios/`).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ usuarios, edificios }) => {
        // Solo mostramos los usuarios con rol auxiliar
        const aux = usuarios.filter(u => u.rol?.rol_id === ROL_AUXILIAR);
        this.auxiliares.set(aux);
        this.edificios.set(edificios.filter(e => e.estado));
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.detail || 'No se pudieron cargar los auxiliares.');
        this.loading.set(false);
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Helpers de presentación
  // ═══════════════════════════════════════════════════════════════════════════

  initials(a: AuxiliarUsuario): string {
    const parts = a.nombre.trim().split(' ');
    const first = parts[0]?.[0] ?? '';
    const last  = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
    return (first + last).toUpperCase();
  }

  edificioNombre(idEdificio: number | null): string {
    if (!idEdificio) return '—';
    const ed = this.edificios().find(e => e.id_edificio === idEdificio);
    return ed ? `${ed.nombre} (${ed.codigo})` : `Edificio #${idEdificio}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Filtros y paginación
  // ═══════════════════════════════════════════════════════════════════════════

  setFiltroEstado(value: 'todos' | 'activos' | 'inactivos'): void {
    this.filtroEstado.set(value);
    this.pageIndex.set(0);
  }

  setSearch(value: string): void {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
  }

  pagePrev(): void {
    if (this.pageIndex() > 0) this.pageIndex.update(i => i - 1);
  }

  pageNext(): void {
    if (this.pageIndex() < this.totalPages() - 1) this.pageIndex.update(i => i + 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Modal CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  openCreate(): void {
    this.editing.set(null);
    // Al crear, la contraseña es obligatoria
    this.form.get('pwsd')!.setValidators([
      Validators.required, Validators.minLength(6), Validators.maxLength(60)
    ]);
    this.form.get('pwsd')!.updateValueAndValidity();
    this.form.reset({ nombre: '', correo: '', pwsd: '', id_edificio: null });
    this.saveError.set('');
    this.showFormModal.set(true);
  }

  openEdit(a: AuxiliarUsuario): void {
    this.editing.set(a);
    // Al editar, la contraseña es opcional
    this.form.get('pwsd')!.setValidators([Validators.minLength(6), Validators.maxLength(60)]);
    this.form.get('pwsd')!.updateValueAndValidity();
    this.form.reset({
      nombre:      a.nombre,
      correo:      a.correo,
      pwsd:        '',
      id_edificio: a.id_edificio,
    });
    this.saveError.set('');
    this.showFormModal.set(true);
  }

  closeForm(): void {
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
    const editing = this.editing();

    if (editing) {
      // Edición: PUT /usuarios/{id}
      // Solo actualizamos nombre, correo, id_edificio y estado.
      // El backend acepta un payload parcial; mandamos lo que tenemos.
      const payload: Partial<CreateAuxiliarPayload> & { id_edificio?: number | null } = {
        nombre:      raw.nombre.trim(),
        correo:      raw.correo.trim().toLowerCase(),
        estado:      editing.estado,
        rol_id:      ROL_AUXILIAR,
        id_edificio: raw.id_edificio ?? null,
      };
      if (raw.pwsd?.trim()) {
        (payload as any).pwsd = raw.pwsd.trim();
      }

      this.http.put<AuxiliarUsuario>(`${this.base}/usuarios/${editing.id_usuario}`, payload).subscribe({
        next: (updated) => {
          this.auxiliares.update(list =>
            list.map(x => x.id_usuario === updated.id_usuario ? updated : x)
          );
          this.saving.set(false);
          this.showFormModal.set(false);
        },
        error: (err) => {
          this.saveError.set(err?.error?.detail || 'No se pudo actualizar el auxiliar.');
          this.saving.set(false);
        },
      });
    } else {
      // Creación: POST /usuarios/
      const payload: CreateAuxiliarPayload = {
        nombre:  raw.nombre.trim(),
        correo:  raw.correo.trim().toLowerCase(),
        pwsd:    raw.pwsd.trim(),
        estado:  true,
        rol_id:  ROL_AUXILIAR,
      };
      // id_edificio no es parte del payload de creación de usuario base;
      // si el backend lo acepta en la misma llamada, se puede agregar:
      (payload as any).id_edificio = raw.id_edificio ?? null;

      this.http.post<AuxiliarUsuario>(`${this.base}/usuarios/`, payload).subscribe({
        next: (created) => {
          this.auxiliares.update(list => [...list, created]);
          this.saving.set(false);
          this.showFormModal.set(false);
        },
        error: (err) => {
          this.saveError.set(err?.error?.detail || 'No se pudo crear el auxiliar.');
          this.saving.set(false);
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Activar / Desactivar (toggle lógico)
  // ═══════════════════════════════════════════════════════════════════════════

  requestToggle(a: AuxiliarUsuario): void {
    this.toggleTarget.set(a);
    this.toggleError.set('');
    this.showToggleDialog.set(true);
  }

  cancelToggle(): void {
    if (this.toggling()) return;
    this.showToggleDialog.set(false);
  }

  confirmToggle(): void {
    const a = this.toggleTarget();
    if (!a) return;
    this.toggling.set(true);

    this.http.put<AuxiliarUsuario>(
      `${this.base}/usuarios/${a.id_usuario}`,
      { estado: !a.estado }
    ).subscribe({
      next: () => {
        this.auxiliares.update(list =>
          list.map(x => x.id_usuario === a.id_usuario ? { ...x, estado: !a.estado } : x)
        );
        this.toggling.set(false);
        this.showToggleDialog.set(false);
      },
      error: (err) => {
        this.toggleError.set(err?.error?.detail || 'No se pudo actualizar el estado.');
        this.toggling.set(false);
      },
    });
  }
}