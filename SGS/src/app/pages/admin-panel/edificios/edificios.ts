// src/app/pages/admin-panel/edificios/edificios.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog';
import {
  EdificiosService,
  Edificio, EdificioCreatePayload, EdificioUpdatePayload,
  Aula, AulaCreatePayload, BulkAulaResult
} from '../../../services/edificios.service';

import * as XLSX from 'xlsx';

/**
 * /admin/edificios
 *
 * Layout master-detail:
 *   - Izquierda: lista de edificios con CRUD
 *   - Derecha:   aulas del edificio seleccionado, con CRUD + carga masiva XLSX
 *
 * Validación de código de aula: ^A[1-9]-[1-9](0[1-9]|1[0-9]|20)$
 * (definida en el backend, replicada aquí para validar antes de enviar)
 */
@Component({
  selector: 'app-admin-edificios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: 'edificios.html',
  styleUrls: ['edificios.css'],
})
export class AdminEdificiosComponent implements OnInit {
  private fb  = inject(FormBuilder);
  private svc = inject(EdificiosService);

  // Patrón del backend
  readonly PATRON_AULA = /^A[1-9]-[1-9](0[1-9]|1[0-9]|20)$/;

  // ── Estado: edificios ────────────────────────────────────────
  edificios     = signal<Edificio[]>([]);
  loadingEd     = signal(true);
  errorEd       = signal('');
  selectedId    = signal<number | null>(null);
  searchTerm    = signal('');

  readonly selected = computed(() =>
    this.edificios().find(e => e.id_edificio === this.selectedId()) ?? null
  );

  readonly filteredEdificios = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.edificios();
    return this.edificios().filter(e =>
      e.nombre.toLowerCase().includes(term) ||
      e.codigo.toLowerCase().includes(term)
    );
  });

  // Modal CRUD edificio
  showEdModal       = signal(false);
  editingEdificio   = signal<Edificio | null>(null);
  savingEd          = signal(false);
  saveEdError       = signal('');

  edForm: FormGroup = this.fb.group({
    nombre:         ['', [Validators.required, Validators.maxLength(100)]],
    codigo:         ['', [Validators.required, Validators.pattern(/^A[1-9]$/)]],
    cantidad_pisos: [1,  [Validators.required, Validators.min(1), Validators.max(20)]],
  });

  showDeleteEd      = signal(false);
  edToDelete        = signal<Edificio | null>(null);
  deletingEd        = signal(false);
  deleteEdError     = signal('');

  // ── Estado: aulas ────────────────────────────────────────────
  aulas       = signal<Aula[]>([]);
  loadingAul  = signal(false);
  errorAul    = signal('');
  filtroPiso  = signal<number | 'todos'>('todos');

  readonly filteredAulas = computed(() => {
    const f = this.filtroPiso();
    if (f === 'todos') return this.aulas();
    return this.aulas().filter(a => a.piso === f);
  });

  readonly pisosDisponibles = computed(() => {
    const ed = this.selected();
    if (!ed) return [];
    return Array.from({ length: ed.cantidad_pisos }, (_, i) => i + 1);
  });

  // Modal CRUD aula
  showAulaModal     = signal(false);
  editingAula       = signal<Aula | null>(null);
  savingAula        = signal(false);
  saveAulaError     = signal('');

  aulaForm: FormGroup = this.fb.group({
    codigo:      ['', [Validators.required, Validators.pattern(this.PATRON_AULA)]],
    nombre_aula: [''],
    piso:        [1, [Validators.required, Validators.min(1)]],
    capacidad:   [30, [Validators.required, Validators.min(1), Validators.max(500)]],
  });

  showDeleteAula    = signal(false);
  aulaToDelete      = signal<Aula | null>(null);
  deletingAula      = signal(false);
  deleteAulaError   = signal('');

  // ── Carga masiva ─────────────────────────────────────────────
  showBulkModal     = signal(false);
  bulkParsed        = signal<{ row: number; data: AulaCreatePayload; valid: boolean; error?: string }[]>([]);
  bulkUploading     = signal(false);
  bulkResults       = signal<BulkAulaResult[]>([]);
  bulkProgress      = signal(0);
  bulkFile          = signal<File | null>(null);

  readonly bulkValidCount   = computed(() => this.bulkParsed().filter(r => r.valid).length);
  readonly bulkInvalidCount = computed(() => this.bulkParsed().filter(r => !r.valid).length);
  readonly bulkResultsOkCount  = computed(() => this.bulkResults().filter(r => r.success).length);
  readonly bulkResultsErrCount = computed(() => this.bulkResults().filter(r => !r.success).length);

  ngOnInit(): void {
    this.cargarEdificios();
  }

  // ═════════════════════════════════════════════════════════════
  //  Edificios
  // ═════════════════════════════════════════════════════════════
  cargarEdificios(): void {
    this.loadingEd.set(true);
    this.errorEd.set('');
    this.svc.listEdificios().subscribe({
      next: (data) => {
        this.edificios.set(data);
        this.loadingEd.set(false);
        // Auto-seleccionar el primero si no hay nada seleccionado
        if (!this.selectedId() && data.length > 0) {
          this.selectEdificio(data[0].id_edificio);
        }
      },
      error: (err) => {
        this.errorEd.set(err?.error?.detail || 'Error al cargar edificios');
        this.loadingEd.set(false);
      }
    });
  }

  selectEdificio(id: number): void {
    this.selectedId.set(id);
    this.filtroPiso.set('todos');
    this.cargarAulas(id);
  }

  // ── Modal edificio ────────────────────────────────────────────
  openCreateEdificio(): void {
    this.editingEdificio.set(null);
    this.edForm.reset({ nombre: '', codigo: '', cantidad_pisos: 1 });
    this.saveEdError.set('');
    this.showEdModal.set(true);
  }

  openEditEdificio(e: Edificio): void {
    this.editingEdificio.set(e);
    this.edForm.reset({
      nombre: e.nombre,
      codigo: e.codigo,
      cantidad_pisos: e.cantidad_pisos,
    });
    this.saveEdError.set('');
    this.showEdModal.set(true);
  }

  closeEdModal(): void {
    if (this.savingEd()) return;
    this.showEdModal.set(false);
  }

  edFieldHasError(field: string): boolean {
    const c = this.edForm.get(field);
    return !!(c && c.invalid && c.touched);
  }

  saveEdificio(): void {
    if (this.edForm.invalid) {
      this.edForm.markAllAsTouched();
      return;
    }
    this.savingEd.set(true);
    this.saveEdError.set('');

    const raw = this.edForm.value;
    const payload: EdificioCreatePayload = {
      nombre: raw.nombre.trim(),
      codigo: raw.codigo.trim().toUpperCase(),
      cantidad_pisos: Number(raw.cantidad_pisos),
    };

    const editing = this.editingEdificio();
    const obs = editing
      ? this.svc.updateEdificio(editing.id_edificio, payload as EdificioUpdatePayload)
      : this.svc.createEdificio(payload);

    obs.subscribe({
      next: (e) => {
        if (editing) {
          this.edificios.update(list => list.map(x => x.id_edificio === e.id_edificio ? e : x));
        } else {
          this.edificios.update(list => [...list, e]);
          this.selectEdificio(e.id_edificio);
        }
        this.savingEd.set(false);
        this.showEdModal.set(false);
      },
      error: (err) => {
        this.saveEdError.set(err?.error?.detail || 'No se pudo guardar el edificio');
        this.savingEd.set(false);
      }
    });
  }

  // ── Eliminar edificio ────────────────────────────────────────
  requestDeleteEdificio(e: Edificio): void {
    this.edToDelete.set(e);
    this.deleteEdError.set('');
    this.showDeleteEd.set(true);
  }

  cancelDeleteEdificio(): void {
    if (this.deletingEd()) return;
    this.showDeleteEd.set(false);
  }

  confirmDeleteEdificio(): void {
    const e = this.edToDelete();
    if (!e) return;
    this.deletingEd.set(true);
    this.svc.removeEdificio(e.id_edificio).subscribe({
      next: (res) => {
        // Si el backend hizo soft-delete, el estado pasa a false. Si fue hard-delete, lo quitamos.
        if (res.detail.includes('desactivado')) {
          this.edificios.update(list => list.map(x =>
            x.id_edificio === e.id_edificio ? { ...x, estado: false } : x
          ));
        } else {
          this.edificios.update(list => list.filter(x => x.id_edificio !== e.id_edificio));
          if (this.selectedId() === e.id_edificio) {
            const next = this.edificios()[0];
            this.selectedId.set(next?.id_edificio ?? null);
            if (next) this.cargarAulas(next.id_edificio);
            else this.aulas.set([]);
          }
        }
        this.deletingEd.set(false);
        this.showDeleteEd.set(false);
      },
      error: (err) => {
        this.deleteEdError.set(err?.error?.detail || 'No se pudo eliminar');
        this.deletingEd.set(false);
      }
    });
  }

  // ═════════════════════════════════════════════════════════════
  //  Aulas
  // ═════════════════════════════════════════════════════════════
  cargarAulas(idEdificio: number): void {
    this.loadingAul.set(true);
    this.errorAul.set('');
    this.svc.listAulasPorEdificio(idEdificio).subscribe({
      next: (data) => {
        this.aulas.set(data.sort((a, b) => a.piso - b.piso || a.codigo.localeCompare(b.codigo)));
        this.loadingAul.set(false);
      },
      error: (err) => {
        this.errorAul.set(err?.error?.detail || 'Error al cargar aulas');
        this.aulas.set([]);
        this.loadingAul.set(false);
      }
    });
  }

  // ── Sugerir código de aula al cambiar piso ──────────────────
  /**
   * Sugiere automáticamente el siguiente código de aula disponible
   * según el patrón A{edificio}-{piso}{salon}
   */
  sugerirCodigoAula(): void {
    const ed = this.selected();
    if (!ed) return;
    const piso = Number(this.aulaForm.get('piso')?.value);
    if (!piso) return;

    // Códigos existentes en este piso
    const usados = this.aulas()
      .filter(a => a.piso === piso)
      .map(a => a.codigo);

    // Buscar el siguiente número de salón libre (01-20)
    for (let salon = 1; salon <= 20; salon++) {
      const salonStr = String(salon).padStart(2, '0');
      const codigo = `${ed.codigo}-${piso}${salonStr}`;
      if (!usados.includes(codigo)) {
        this.aulaForm.patchValue({ codigo });
        return;
      }
    }
  }

  // ── Modal aula ───────────────────────────────────────────────
  openCreateAula(): void {
    const ed = this.selected();
    if (!ed) return;
    this.editingAula.set(null);
    this.aulaForm.reset({ codigo: '', nombre_aula: '', piso: 1, capacidad: 30 });
    this.saveAulaError.set('');
    // Sugerir código tras pequeño delay para que el form se monte
    setTimeout(() => this.sugerirCodigoAula(), 0);
    this.showAulaModal.set(true);
  }

  openEditAula(a: Aula): void {
    this.editingAula.set(a);
    this.aulaForm.reset({
      codigo: a.codigo,
      nombre_aula: a.nombre_aula ?? '',
      piso: a.piso,
      capacidad: a.capacidad,
    });
    this.saveAulaError.set('');
    this.showAulaModal.set(true);
  }

  closeAulaModal(): void {
    if (this.savingAula()) return;
    this.showAulaModal.set(false);
  }

  aulaFieldHasError(field: string): boolean {
    const c = this.aulaForm.get(field);
    return !!(c && c.invalid && c.touched);
  }

  saveAula(): void {
    const ed = this.selected();
    if (!ed) return;
    if (this.aulaForm.invalid) {
      this.aulaForm.markAllAsTouched();
      return;
    }

    const raw = this.aulaForm.value;
    const piso = Number(raw.piso);
    if (piso < 1 || piso > ed.cantidad_pisos) {
      this.saveAulaError.set(`El piso debe estar entre 1 y ${ed.cantidad_pisos}`);
      return;
    }

    this.savingAula.set(true);
    this.saveAulaError.set('');

    const payload: AulaCreatePayload = {
      codigo:      raw.codigo.trim().toUpperCase(),
      nombre_aula: raw.nombre_aula?.trim() || null,
      piso,
      capacidad:   Number(raw.capacidad),
      id_edificio: ed.id_edificio,
    };

    const editing = this.editingAula();
    const obs = editing
      ? this.svc.updateAula(editing.id_aula, payload)
      : this.svc.createAula(payload);

    obs.subscribe({
      next: (a) => {
        if (editing) {
          this.aulas.update(list => list.map(x => x.id_aula === a.id_aula ? a : x));
        } else {
          this.aulas.update(list =>
            [...list, a].sort((x, y) => x.piso - y.piso || x.codigo.localeCompare(y.codigo))
          );
        }
        this.savingAula.set(false);
        this.showAulaModal.set(false);
      },
      error: (err) => {
        this.saveAulaError.set(err?.error?.detail || 'No se pudo guardar el aula');
        this.savingAula.set(false);
      }
    });
  }

  // ── Eliminar aula ────────────────────────────────────────────
  requestDeleteAula(a: Aula): void {
    this.aulaToDelete.set(a);
    this.deleteAulaError.set('');
    this.showDeleteAula.set(true);
  }

  cancelDeleteAula(): void {
    if (this.deletingAula()) return;
    this.showDeleteAula.set(false);
  }

  confirmDeleteAula(): void {
    const a = this.aulaToDelete();
    if (!a) return;
    this.deletingAula.set(true);
    this.svc.removeAula(a.id_aula).subscribe({
      next: () => {
        this.aulas.update(list => list.filter(x => x.id_aula !== a.id_aula));
        this.deletingAula.set(false);
        this.showDeleteAula.set(false);
      },
      error: (err) => {
        this.deleteAulaError.set(err?.error?.detail || 'No se pudo eliminar');
        this.deletingAula.set(false);
      }
    });
  }

  // ═════════════════════════════════════════════════════════════
  //  Carga masiva XLSX
  // ═════════════════════════════════════════════════════════════
  openBulkModal(): void {
    this.bulkParsed.set([]);
    this.bulkResults.set([]);
    this.bulkProgress.set(0);
    this.bulkFile.set(null);
    this.showBulkModal.set(true);
  }

  closeBulkModal(): void {
    if (this.bulkUploading()) return;
    this.showBulkModal.set(false);
  }

  /**
   * Lee un archivo .xlsx esperando columnas:
   *   codigo (string) | nombre_aula (string opcional) | piso (number) | capacidad (number)
   * Valida cada fila contra el patrón del backend antes de cargar.
   */
  onBulkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    const ed = this.selected();
    if (!ed) return;

    this.bulkFile.set(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });

        const parsed = rows.map((row, idx) => {
          const codigo      = String(row.codigo ?? row.Codigo ?? row.CODIGO ?? '').trim().toUpperCase();
          const nombre_aula = String(row.nombre_aula ?? row.nombre ?? row.Nombre ?? '').trim() || null;
          const piso        = Number(row.piso ?? row.Piso ?? 0);
          const capacidad   = Number(row.capacidad ?? row.Capacidad ?? 0);

          let valid = true;
          let error = '';

          if (!codigo) { valid = false; error = 'Código vacío'; }
          else if (!this.PATRON_AULA.test(codigo)) {
            valid = false;
            error = 'Formato inválido (ej: A2-201)';
          } else if (piso < 1 || piso > ed.cantidad_pisos) {
            valid = false;
            error = `Piso debe estar entre 1 y ${ed.cantidad_pisos}`;
          } else if (capacidad < 1 || capacidad > 500) {
            valid = false;
            error = 'Capacidad inválida (1-500)';
          }

          return {
            row: idx + 2, // +2 porque row 1 son las cabeceras y los humanos cuentan desde 1
            data: {
              codigo,
              nombre_aula,
              piso,
              capacidad,
              id_edificio: ed.id_edificio,
            } as AulaCreatePayload,
            valid,
            error: valid ? undefined : error,
          };
        });

        this.bulkParsed.set(parsed);
      } catch (err: any) {
        alert('No se pudo leer el archivo: ' + (err?.message ?? err));
      }
    };
    reader.readAsArrayBuffer(file);
  }

  startBulkUpload(): void {
    const validRows = this.bulkParsed().filter(r => r.valid).map(r => r.data);
    if (validRows.length === 0) return;

    this.bulkUploading.set(true);
    this.bulkProgress.set(0);
    this.bulkResults.set([]);

    this.svc.createAulasBulk(validRows).subscribe({
      next: (results) => {
        this.bulkResults.set(results);
        this.bulkUploading.set(false);
        this.bulkProgress.set(100);

        // Recargar aulas si hubo al menos un éxito
        const ed = this.selected();
        if (ed && results.some(r => r.success)) {
          this.cargarAulas(ed.id_edificio);
        }
      },
      error: () => {
        this.bulkUploading.set(false);
      }
    });
  }

  resetBulk(): void {
    this.bulkParsed.set([]);
    this.bulkResults.set([]);
    this.bulkFile.set(null);
    this.bulkProgress.set(0);
  }

  /**
   * Genera y descarga una plantilla XLSX con las columnas esperadas.
   */
  descargarPlantilla(): void {
    const ed = this.selected();
    const codigoEd = ed?.codigo ?? 'A2';
    const sample = [
      { codigo: `${codigoEd}-101`, nombre_aula: 'Aula 101', piso: 1, capacidad: 30 },
      { codigo: `${codigoEd}-102`, nombre_aula: 'Aula 102', piso: 1, capacidad: 30 },
      { codigo: `${codigoEd}-201`, nombre_aula: 'Aula 201', piso: 2, capacidad: 25 },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Aulas');
    XLSX.writeFile(wb, `plantilla-aulas-${codigoEd}.xlsx`);
  }

  // ═════════════════════════════════════════════════════════════
  //  Helpers
  // ═════════════════════════════════════════════════════════════
  countAulasPorEdificio(idEdificio: number): number {
    if (this.selectedId() === idEdificio) return this.aulas().length;
    return 0; // No tenemos contador global; se calcula al seleccionar
  }
}
