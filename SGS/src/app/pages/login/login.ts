import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  imports: [CommonModule, ReactiveFormsModule],
  styleUrls: ['./login.css'],
  standalone: true
})
export class Login {
  form: FormGroup;
  changePassForm: FormGroup;

  showPassword        = signal(false);
  showCurrentPassword = signal(false);
  showNewPassword     = signal(false);
  showConfirmPassword = signal(false);

  isLoading          = signal(false);
  errorMsg           = signal('');
  successMsg         = signal('');
  showChangePassword = signal(false);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.changePassForm = this.fb.group({
      current_password: ['', Validators.required],
      new_password:     ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', Validators.required]
    }, { validators: this.passwordsMatch });
  }

  private passwordsMatch(group: FormGroup) {
    const np = group.get('new_password')?.value;
    const cp = group.get('confirm_password')?.value;
    return np === cp ? null : { mismatch: true };
  }

  togglePassword()        { this.showPassword.update(v => !v); }
  toggleCurrentPassword() { this.showCurrentPassword.update(v => !v); }
  toggleNewPassword()     { this.showNewPassword.update(v => !v); }
  toggleConfirmPassword() { this.showConfirmPassword.update(v => !v); }

  login() {
    this.errorMsg.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.isLoading.set(true);
    this.auth.login(this.form.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        const role = this.auth.getRole();
        if (role === 'administrador') {
          this.router.navigate(['/adminPanel']);
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMsg.set('Credenciales incorrectas.');
        } else if (err.status === 403) {
          this.errorMsg.set('Usuario inactivo. Contacta al administrador.');
        } else {
          this.errorMsg.set('Error al conectar con el servidor. Verifica que el backend esté activo.');
        }
      }
    });
  }

  submitChangePassword() {
    this.errorMsg.set('');
    this.successMsg.set('');
    if (this.changePassForm.invalid) { this.changePassForm.markAllAsTouched(); return; }

    const { current_password, new_password } = this.changePassForm.value;
    this.isLoading.set(true);
    this.auth.changePassword({ current_password, new_password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMsg.set('Contraseña actualizada exitosamente.');
        this.changePassForm.reset();
        setTimeout(() => {
          this.showChangePassword.set(false);
          this.successMsg.set('');
        }, 2000);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMsg.set(err.error?.detail || 'Error al cambiar la contraseña.');
      }
    });
  }

  openChangePassword() {
    this.showChangePassword.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');
    this.changePassForm.reset();
  }

  closeChangePassword() {
    this.showChangePassword.set(false);
    this.errorMsg.set('');
    this.successMsg.set('');
  }

  hasError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  hasChangeError(field: string): boolean {
    const ctrl = this.changePassForm.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}
