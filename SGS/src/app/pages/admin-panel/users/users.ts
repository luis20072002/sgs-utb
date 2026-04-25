import { Component, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule, FormBuilder, FormGroup,
  Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { DocenteRow } from '../teachers/teachers';
 
interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'activo' | 'inactivo';
}
 
// Validador: mínimo 8 caracteres, una mayúscula, un número
function passwordStrength(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value || '';
  if (!v) return null;
  if (v.length < 8)            return { tooShort: true };
  if (!/[A-Z]/.test(v))        return { noUppercase: true };
  if (!/[0-9]/.test(v))        return { noNumber: true };
  return null;
}
 
// Validador: solo dígitos y longitud razonable para teléfono
function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value || '';
  if (!v) return null;
  if (!/^\+?[\d\s\-]{7,15}$/.test(v)) return { invalidPhone: true };
  return null;
}
 
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class UsersComponent {
  users: UserRow[] = [
    { id: '1', name: 'Ana Martínez',   email: 'ana@sgs.com',     role: 'administrador', status: 'activo'   },
    { id: '2', name: 'Juan Pérez',     email: 'juan@sgs.com',    role: 'auxiliar',      status: 'activo'   },
    { id: '3', name: 'Roberto Gómez',  email: 'roberto@sgs.com', role: 'auxiliar',      status: 'inactivo' },
    { id: '4', name: 'María López',    email: 'maria@sgs.com',   role: 'docente',       status: 'activo'   },
    { id: '5', name: 'Carlos Herrera', email: 'carlos@sgs.com',  role: 'docente',       status: 'activo'   },
  ];
 
  /** Emite al AdminPanel cuando un docente nuevo es creado exitosamente */
  @Output() docenteCreado = new EventEmitter<DocenteRow>();
 
  // ── Modal: inhabilitar / habilitar ────────────────────────
  showModal     = signal(false);
  password      = signal('');
  passwordError = signal('');
  showPassword  = signal(false);
  userToToggle  = signal<UserRow | null>(null);
  private readonly ADMIN_PASSWORD = '123';
 
  // ── Modal: crear auxiliar ─────────────────────────────────
  showCreateModal = signal(false);
  isCreating      = signal(false);
  createSuccess   = signal(false);
  createError     = signal('');
  showNewPassword = signal(false);
  showConfirmPass = signal(false);
  createForm: FormGroup;
 
  // ── Modal: agregar docente ────────────────────────────────
  showDocenteModal  = signal(false);
  isCreatingDocente = signal(false);
  docenteSuccess    = signal(false);
  docenteError      = signal('');
  docenteForm: FormGroup;
 
  constructor(private fb: FormBuilder, private userService: UserService) {
    this.createForm = this.fb.group(
      {
        name:            ['', [Validators.required, Validators.minLength(3)]],
        email:           ['', [Validators.required, Validators.email]],
        password:        ['', [Validators.required, passwordStrength]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.matchPasswords }
    );
 
    this.docenteForm = this.fb.group({
      id_docente: ['', [Validators.required, Validators.minLength(3)]],
      nombre:     ['', [Validators.required, Validators.minLength(2)]],
      apellido:   ['', [Validators.required, Validators.minLength(2)]],
      email:      ['', [Validators.required, Validators.email]],
      telefono:   ['', [Validators.required, phoneValidator]],
    });
  }
 
  private matchPasswords(group: AbstractControl): ValidationErrors | null {
    const p  = group.get('password')?.value;
    const cp = group.get('confirmPassword')?.value;
    return p && cp && p !== cp ? { mismatch: true } : null;
  }
 
  // ── Helpers formulario auxiliar ───────────────────────────
  fieldError(field: string): boolean {
    const c = this.createForm.get(field);
    return !!(c && c.invalid && c.touched);
  }
 
  passwordHint(): string {
    const err = this.createForm.get('password')?.errors;
    if (!err) return '';
    if (err['tooShort'])    return 'Mínimo 8 caracteres';
    if (err['noUppercase']) return 'Debe incluir al menos una mayúscula';
    if (err['noNumber'])    return 'Debe incluir al menos un número';
    return '';
  }
 
  passwordStrengthLevel(): 'weak' | 'medium' | 'strong' | '' {
    const v: string = this.createForm.get('password')?.value || '';
    if (!v) return '';
    const score = [
      v.length >= 8,
      /[A-Z]/.test(v),
      /[0-9]/.test(v),
      /[^a-zA-Z0-9]/.test(v)
    ].filter(Boolean).length;
    if (score <= 2) return 'weak';
    if (score === 3) return 'medium';
    return 'strong';
  }
 
  // ── Apertura / cierre modal crear auxiliar ────────────────
  openCreateModal(): void {
    this.createForm.reset();
    this.createError.set('');
    this.createSuccess.set(false);
    this.showNewPassword.set(false);
    this.showConfirmPass.set(false);
    this.showCreateModal.set(true);
  }
 
  closeCreateModal(): void {
    if (this.isCreating()) return;
    this.showCreateModal.set(false);
  }
 
  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.isCreating.set(true);
    this.createError.set('');
    const { name, email, password } = this.createForm.value;
 
    this.userService.createUser({ name, email, password, role: 'auxiliar' }).subscribe({
      next: (res: any) => {
        const newUser: UserRow = {
          id:     res?.id    ?? String(Date.now()),
          name:   res?.name  ?? name,
          email:  res?.email ?? email,
          role:   'auxiliar',
          status: 'activo',
        };
        this.users = [...this.users, newUser];
        this.isCreating.set(false);
        this.createSuccess.set(true);
        setTimeout(() => {
          this.showCreateModal.set(false);
          this.createSuccess.set(false);
        }, 2000);
      },
      error: (err: any) => {
        this.isCreating.set(false);
        const msg = err?.error?.detail || err?.error?.message;
        this.createError.set(msg || 'No se pudo crear el auxiliar. Intenta de nuevo.');
      }
    });
  }
 
  // ── Apertura / cierre modal docente ──────────────────────
  openDocenteModal(): void {
    this.docenteForm.reset();
    this.docenteError.set('');
    this.docenteSuccess.set(false);
    this.showDocenteModal.set(true);
  }
 
  closeDocenteModal(): void {
    if (this.isCreatingDocente()) return;
    this.showDocenteModal.set(false);
  }
 
  docenteFieldError(field: string): boolean {
    const c = this.docenteForm.get(field);
    return !!(c && c.invalid && c.touched);
  }
 
  submitDocente(): void {
    if (this.docenteForm.invalid) {
      this.docenteForm.markAllAsTouched();
      return;
    }
    this.isCreatingDocente.set(true);
    this.docenteError.set('');
    const { id_docente, nombre, apellido, email, telefono } = this.docenteForm.value;
 
    this.userService.createDocente({ id_docente, nombre, apellido, email, telefono }).subscribe({
      next: (res: any) => {
        const newUser: UserRow = {
          id:     res?.id_docente ?? id_docente,
          name:   `${res?.nombre ?? nombre} ${res?.apellido ?? apellido}`,
          email:  res?.email ?? email,
          role:   'docente',
          status: 'activo',
        };
        this.users = [...this.users, newUser];
 
        // Notificar al AdminPanel para que TeachersComponent lo reciba
        const docenteRow: DocenteRow = {
          id_docente: res?.id_docente ?? id_docente,
          nombre:     res?.nombre    ?? nombre,
          apellido:   res?.apellido  ?? apellido,
          email:      res?.email     ?? email,
          telefono:   res?.telefono  ?? telefono,
          status:     'activo',
        };
        this.docenteCreado.emit(docenteRow);
 
        this.isCreatingDocente.set(false);
        this.docenteSuccess.set(true);
        setTimeout(() => {
          this.showDocenteModal.set(false);
          this.docenteSuccess.set(false);
        }, 2000);
      },
      error: (err: any) => {
        this.isCreatingDocente.set(false);
        const msg = err?.error?.detail || err?.error?.message;
        this.docenteError.set(msg || 'No se pudo registrar el docente. Intenta de nuevo.');
      }
    });
  }
 
  // ── Toggle inhabilitar / habilitar ────────────────────────
  canToggle(u: UserRow): boolean {
    return u.role === 'auxiliar';
  }
 
  toggleAction(u: UserRow): 'inhabilitar' | 'habilitar' {
    return u.status === 'activo' ? 'inhabilitar' : 'habilitar';
  }
 
  requestToggle(u: UserRow): void {
    this.userToToggle.set(u);
    this.password.set('');
    this.passwordError.set('');
    this.showPassword.set(false);
    this.showModal.set(true);
  }
 
  closeModal(): void {
    this.showModal.set(false);
    this.userToToggle.set(null);
  }
 
  confirmToggle(): void {
    if (this.password() !== this.ADMIN_PASSWORD) {
      this.passwordError.set('Contraseña incorrecta. Inténtalo de nuevo.');
      return;
    }
    const target = this.userToToggle();
    if (target) {
      const idx = this.users.findIndex(u => u.id === target.id);
      if (idx !== -1) {
        this.users[idx] = {
          ...this.users[idx],
          status: this.users[idx].status === 'activo' ? 'inactivo' : 'activo'
        };
        this.users = [...this.users];
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
}