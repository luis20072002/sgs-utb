import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';
 
export interface DocenteRow {
  id_docente: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  status: 'activo' | 'inactivo';
}
 
@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teachers.html',
  styleUrls: ['./teachers.css']
})
export class TeachersComponent implements OnChanges {
  /** Recibe docentes nuevos creados desde el componente de Usuarios */
  @Input() newDocentes: DocenteRow[] = [];
 
  docentes: DocenteRow[] = [
    { id_docente: 'DOC-001', nombre: 'María',   apellido: 'López',   email: 'maria@sgs.com',   telefono: '+57 300 111 2233', status: 'activo'   },
    { id_docente: 'DOC-002', nombre: 'Carlos',  apellido: 'Herrera', email: 'carlos@sgs.com',  telefono: '+57 310 444 5566', status: 'activo'   },
    { id_docente: 'DOC-003', nombre: 'Lucía',   apellido: 'Ramírez', email: 'lucia@sgs.com',   telefono: '+57 320 777 8899', status: 'inactivo' },
  ];
 
  // ── Modal confirmar toggle ────────────────────────────────
  showModal      = signal(false);
  password       = signal('');
  passwordError  = signal('');
  showPassword   = signal(false);
  docenteToggle  = signal<DocenteRow | null>(null);
  private readonly ADMIN_PASSWORD = '123';
 
  constructor(private userService: UserService) {}
 
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['newDocentes'] && this.newDocentes?.length) {
      // Agregar docentes nuevos que no estén ya en la lista
      const existingIds = new Set(this.docentes.map(d => d.id_docente));
      const toAdd = this.newDocentes.filter(d => !existingIds.has(d.id_docente));
      if (toAdd.length) {
        this.docentes = [...this.docentes, ...toAdd];
      }
    }
  }
 
  toggleAction(d: DocenteRow): 'inhabilitar' | 'habilitar' {
    return d.status === 'activo' ? 'inhabilitar' : 'habilitar';
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
    if (this.password() !== this.ADMIN_PASSWORD) {
      this.passwordError.set('Contraseña incorrecta. Inténtalo de nuevo.');
      return;
    }
    const target = this.docenteToggle();
    if (target) {
      const idx = this.docentes.findIndex(d => d.id_docente === target.id_docente);
      if (idx !== -1) {
        const newStatus = this.docentes[idx].status === 'activo' ? 'inactivo' : 'activo';
        this.docentes[idx] = { ...this.docentes[idx], status: newStatus };
        this.docentes = [...this.docentes];
      }
    }
    this.closeModal();
  }
 
  onPasswordInput(value: string): void {
    this.password.set(value);
    if (this.passwordError()) this.passwordError.set('');
  }
 
  toggleShowPassword(): void {
    this.showPassword.set(!this.showPassword());
  }
 
  get totalActivos(): number   { return this.docentes.filter(d => d.status === 'activo').length; }
  get totalInactivos(): number { return this.docentes.filter(d => d.status === 'inactivo').length; }
}