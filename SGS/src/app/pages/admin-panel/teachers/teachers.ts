import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';

export interface DocenteRow {
  id_docente: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  estado: boolean;
}

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teachers.html',
  styleUrls: ['./teachers.css']
})
export class TeachersComponent implements OnInit {
  docentes: DocenteRow[] = [];
  isLoading = signal(true);
  errorMsg  = signal('');

  // ── Modal confirmar toggle ────────────────────────────────
  showModal     = signal(false);
  password      = signal('');
  passwordError = signal('');
  showPassword  = signal(false);
  docenteToggle = signal<DocenteRow | null>(null);
  isToggling    = signal(false);

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadDocentes();
  }

  loadDocentes(): void {
    this.isLoading.set(true);
    this.errorMsg.set('');
    this.userService.getDocentes().subscribe({
      next: (data) => {
        this.docentes = data;
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudieron cargar los docentes.');
        this.isLoading.set(false);
      }
    });
  }

  requestToggle(d: DocenteRow): void {
    this.docenteToggle.set(d);
    this.password.set('');
    this.passwordError.set('');
    this.showPassword.set(false);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.docenteToggle.set(null);
  }

  confirmToggle(): void {
    const target = this.docenteToggle();
    if (!target) return;

    this.isToggling.set(true);
    const activar = !target.estado;

    this.userService.toggleDocente(target.id_docente, activar).subscribe({
      next: () => {
        const idx = this.docentes.findIndex(d => d.id_docente === target.id_docente);
        if (idx !== -1) {
          this.docentes[idx] = { ...this.docentes[idx], estado: activar };
          this.docentes = [...this.docentes];
        }
        this.isToggling.set(false);
        this.closeModal();
      },
      error: () => {
        this.passwordError.set('Error al actualizar el docente. Inténtalo de nuevo.');
        this.isToggling.set(false);
      }
    });
  }

  onPasswordInput(value: string): void {
    this.password.set(value);
    if (this.passwordError()) this.passwordError.set('');
  }

  toggleShowPassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  get totalActivos(): number   { return this.docentes.filter(d => d.estado).length; }
  get totalInactivos(): number { return this.docentes.filter(d => !d.estado).length; }
}