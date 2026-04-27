import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { forkJoin } from 'rxjs';

export interface CursoRow {
  id_curso: number;
  nombre_curso: string;
  codi_curso: string;
  id_docente: number;
  id_aula: number;
}

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './courses.html',
  styleUrls: ['./courses.css']
})
export class CoursesComponent implements OnInit {
  cursos:   CursoRow[] = [];
  docentes: any[] = [];
  aulas:    any[] = [];

  isLoading  = signal(true);
  errorMsg   = signal('');
  isSaving   = signal(false);
  saveError  = signal('');
  saveOk     = signal(false);

  // Modal crear curso
  showModal = signal(false);
  form = {
    nombre_curso: '',
    codi_curso: '',
    id_docente: 0,
    id_aula: 0,
  };
  formErrors: Record<string, string> = {};

  // Modal confirmar eliminar
  showDeleteModal = signal(false);
  cursoAEliminar  = signal<CursoRow | null>(null);
  isDeleting      = signal(false);
  deleteError     = signal('');

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMsg.set('');
    forkJoin({
      cursos:   this.userService.getCursos(),
      docentes: this.userService.getDocentes(),
      aulas:    this.userService.getAulas(),
    }).subscribe({
      next: ({ cursos, docentes, aulas }) => {
        this.cursos   = cursos;
        this.docentes = docentes;
        this.aulas    = aulas;
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudieron cargar los cursos.');
        this.isLoading.set(false);
      }
    });
  }

  // ── Nombre de docente ────────────────────────────────────
  docenteNombre(id: number): string {
    const d = this.docentes.find(x => x.id_docente === id);
    return d ? `${d.nombre} ${d.apellido}` : `#${id}`;
  }

  // ── Nombre de aula ───────────────────────────────────────
  aulaNombre(id: number): string {
    const a = this.aulas.find(x => x.id_aula === id);
    return a ? (a.nombre_aula || a.nombre || `Aula ${id}`) : `#${id}`;
  }

  // ── Modal crear ──────────────────────────────────────────
  openModal(): void {
    this.form = { nombre_curso: '', codi_curso: '', id_docente: 0, id_aula: 0 };
    this.formErrors = {};
    this.saveError.set('');
    this.saveOk.set(false);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  validate(): boolean {
    this.formErrors = {};
    if (!this.form.nombre_curso.trim()) this.formErrors['nombre_curso'] = 'Campo requerido';
    if (!this.form.codi_curso.trim())   this.formErrors['codi_curso']   = 'Campo requerido';
    if (!this.form.id_docente)          this.formErrors['id_docente']   = 'Selecciona un docente';
    if (!this.form.id_aula)             this.formErrors['id_aula']      = 'Selecciona un aula';
    return Object.keys(this.formErrors).length === 0;
  }

  guardarCurso(): void {
    if (!this.validate()) return;
    this.isSaving.set(true);
    this.saveError.set('');

    this.userService.createCurso({
      nombre_curso: this.form.nombre_curso.trim(),
      codi_curso:   this.form.codi_curso.trim(),
      id_docente:   Number(this.form.id_docente),
      id_aula:      Number(this.form.id_aula),
    }).subscribe({
      next: (nuevo) => {
        this.cursos = [...this.cursos, nuevo];
        this.isSaving.set(false);
        this.saveOk.set(true);
        setTimeout(() => { this.saveOk.set(false); this.closeModal(); }, 1200);
      },
      error: (err) => {
        const detail = err?.error?.detail || 'Error al guardar el curso.';
        this.saveError.set(detail);
        this.isSaving.set(false);
      }
    });
  }

  // ── Modal eliminar ───────────────────────────────────────
  requestDelete(c: CursoRow): void {
    this.cursoAEliminar.set(c);
    this.deleteError.set('');
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.cursoAEliminar.set(null);
  }

  confirmDelete(): void {
    const c = this.cursoAEliminar();
    if (!c) return;
    this.isDeleting.set(true);
    this.userService.deleteCurso(c.id_curso).subscribe({
      next: () => {
        this.cursos = this.cursos.filter(x => x.id_curso !== c.id_curso);
        this.isDeleting.set(false);
        this.closeDeleteModal();
      },
      error: (err) => {
        const detail = err?.error?.detail || 'Error al eliminar.';
        this.deleteError.set(detail);
        this.isDeleting.set(false);
      }
    });
  }
}
