// src/app/pages/login/login.ts
import { Component, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth';

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

  // Visibilidad de contraseñas
  showPassword        = signal(false);
  showCurrentPassword = signal(false);
  showNewPassword     = signal(false);
  showConfirmPassword = signal(false);

  // Estado UI
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

    this.changePassForm = this.fb.group(
      {
        current_password: ['', Validators.required],
        new_password:     ['', [Validators.required, Validators.minLength(6)]],
        confirm_password: ['', Validators.required]
      },
      { validators: this.passwordsMatch }
    );

    // Si por alguna razón ya hay sesión activa, redirigimos directo
    // (evita que un usuario logueado vuelva a ver el login).
    if (this.auth.isLoggedIn()) {
      this.redirectByRole();
    }
  }

  // ── Validador del formulario de cambio de contraseña ─────────
  private passwordsMatch(group: FormGroup) {
    const np = group.get('new_password')?.value;
    const cp = group.get('confirm_password')?.value;
    return np === cp ? null : { mismatch: true };
  }

  // ── Toggles de visibilidad ───────────────────────────────────
  togglePassword()        { this.showPassword.update(v => !v); }
  toggleCurrentPassword() { this.showCurrentPassword.update(v => !v); }
  toggleNewPassword()     { this.showNewPassword.update(v => !v); }
  toggleConfirmPassword() { this.showConfirmPassword.update(v => !v); }

  // ── Login ────────────────────────────────────────────────────
  login() {
    this.errorMsg.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.auth.login(this.form.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.redirectByRole();
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMsg.set(this.parseLoginError(err));
      }
    });
  }

  /**
   * Redirige al usuario según el rol guardado por AuthService.
   * Cumple el requerimiento:
   *   - Administrador → /admin/dashboard
   *   - Auxiliar      → /home
   */
  private redirectByRole(): void {
    const role = this.auth.getRole();
    if (role === 'administrador') {
      this.router.navigate(['/admin/dashboard']);
    } else if (role === 'auxiliar') {
      this.router.navigate(['/home']);
    } else {
      // Caso defensivo: rol desconocido → cerramos sesión
      this.auth.logout();
      this.errorMsg.set('Tu cuenta no tiene un rol válido asignado. Contacta al administrador.');
    }
  }

  /**
   * Convierte el error HTTP en un mensaje amigable.
   * Centralizado para que el template solo muestre `errorMsg()`.
   */
  private parseLoginError(err: any): string {
    // 0 = error de red / CORS / backend caído
    if (err?.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté activo.';
    }
    if (err?.status === 401) {
      return 'Credenciales incorrectas. Revisa tu correo y contraseña.';
    }
    if (err?.status === 403) {
      return 'Tu cuenta está inactiva. Contacta al administrador.';
    }
    if (err?.status === 422) {
      // FastAPI devuelve 422 si el form-data no llegó como espera OAuth2
      return 'Los datos enviados no son válidos.';
    }
    // Fallback: si el backend mandó un detail descriptivo, lo usamos
    return err?.error?.detail ?? 'Ocurrió un error inesperado. Intenta nuevamente.';
  }

  // ── Cambio de contraseña ────────────────────────────────────
  submitChangePassword() {
    this.errorMsg.set('');
    this.successMsg.set('');

    if (this.changePassForm.invalid) {
      this.changePassForm.markAllAsTouched();
      return;
    }

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
        this.errorMsg.set(err?.error?.detail ?? 'Error al cambiar la contraseña.');
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

  // ── Helpers para el template ─────────────────────────────────
  hasError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  hasChangeError(field: string): boolean {
    const ctrl = this.changePassForm.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}