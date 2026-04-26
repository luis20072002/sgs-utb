import { Component, OnInit, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule, FormBuilder, FormGroup,
  Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { DocenteRow } from '../teachers/teachers';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  roleId: number;
  status: 'activo' | 'inactivo';
}

function passwordStrength(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value || '';
  if (!v) return null;
  if (v.length < 8)       return { tooShort: true };
  if (!/[A-Z]/.test(v))   return { noUppercase: true };
  if (!/[0-9]/.test(v))   return { noNumber: true };
  return null;
}

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
export class UsersComponent implements OnInit {
  users: UserRow[] = [];
  isLoadingUsers = signal(false);
  loadError = signal('');

  @Output() docenteCreado = new EventEmitter<DocenteRow>();

  // Modal: inhabilitar / habilitar
  showModal     = signal(false);
  password      = signal('');
  passwordError = signal('');
  showPassword  = signal(false);
  userToToggle  = signal<UserRow | null>(null);
  isToggling    = signal(false);

  // Modal: crear auxiliar
  showCreateModal = signal(false);
  isCreating      = signal(false);
  createSuccess   = signal(false);
  createError     = signal('');
  showNewPassword = signal(false);
  showConfirmPass = signal(false);
  createForm: FormGroup;

  // Modal: agregar docente
  showDocenteModal  = signal(false);
  isCreatingDocente = signal(false);
  docenteSuccess    = signal(false);
  docenteError      = signal('');
  docenteForm: FormGroup;

  constructor(private fb: FormBuilder, private userService: UserService) {
    this.createForm = this.fb.group(
      {
        nombre:          ['', [Validators.required, Validators.minLength(3)]],
        correo:          ['', [Validators.required, Validators.email]],
        password:        ['', [Validators.required, passwordStrength]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.matchPasswords }
    );

    this.docenteForm = this.fb.group({
      nombre:   ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      correo:   ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, phoneValidator]],
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoadingUsers.set(true);
    this.loadError.set('');
    this.userService.getUsuarios().subscribe({
      next: (data: any[]) => {
        this.users = data.map(u => ({
          id:     u.id_usuario,
          name:   u.nombre,
          email:  u.correo || '',
          role:   u.rol?.nombre_rol?.toLowerCase() || 'usuario',
          roleId: u.rol?.rol_id || 0,
          status: u.estado ? 'activo' : 'inactivo'
        }));
        this.isLoadingUsers.set(false);
      },
      error: () => {
        this.loadError.set('No se pudieron cargar los usuarios.');
        this.isLoadingUsers.set(false);
      }
    });
  }

  private matchPasswords(group: AbstractControl): ValidationErrors | null {
    const p  = group.get('password')?.value;
    const cp = group.get('confirmPassword')?.value;
    return p && cp && p !== cp ? { mismatch: true } : null;
  }

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
    const { nombre, correo, password } = this.createForm.value;

    this.userService.createAuxiliar({
      nombre,
      correo,
      pwsd: password,
      estado: true,
      rol_id: 2
    }).subscribe({
      next: (res: any) => {
        const newUser: UserRow = {
          id:     res.id_usuario,
          name:   res.nombre,
          email:  res.correo || correo,
          role:   'auxiliar',
          roleId: 2,
          status: 'activo'
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
        this.createError.set(msg || 'No se pudo crear el auxiliar.');
      }
    });
  }

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
    const { nombre, apellido, correo, telefono } = this.docenteForm.value;

    this.userService.createDocente({ nombre, apellido, correo, telefono }).subscribe({
      next: (res: any) => {
        const docenteRow: DocenteRow = {
          id_docente: String(res.id_docente),
          nombre:     res.nombre,
          apellido:   res.apellido,
          email:      res.correo,
          telefono:   res.telefono,
          status:     'activo'
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
        this.docenteError.set(msg || 'No se pudo registrar el docente.');
      }
    });
  }

  canToggle(u: UserRow): boolean {
    return u.roleId === 2; // solo auxiliares
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
    if (this.isToggling()) return;
    this.showModal.set(false);
    this.userToToggle.set(null);
  }

  confirmToggle(): void {
    const target = this.userToToggle();
    if (!target) return;

    this.isToggling.set(true);
    this.passwordError.set('');
    const nuevoEstado = target.status === 'activo' ? false : true;

    this.userService.toggleUsuario(target.id, nuevoEstado).subscribe({
      next: () => {
        const idx = this.users.findIndex(u => u.id === target.id);
        if (idx !== -1) {
          this.users[idx] = {
            ...this.users[idx],
            status: nuevoEstado ? 'activo' : 'inactivo'
          };
          this.users = [...this.users];
        }
        this.isToggling.set(false);
        this.closeModal();
      },
      error: (err: any) => {
        this.isToggling.set(false);
        this.passwordError.set(err?.error?.detail || 'Error al actualizar el estado.');
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
}
