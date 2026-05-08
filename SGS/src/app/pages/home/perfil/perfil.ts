// src/app/pages/home/perfil/perfil.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';

import { AuthService, UserProfile } from '../../../services/auth';

@Component({
  selector: 'app-home-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.css']
})
export class HomePerfilComponent implements OnInit {
  user = signal<UserProfile | null>(null);

  // Edición de nombre — TODO: cuando exista PUT /usuarios/me se conecta
  // Por ahora solo permite editar el campo localmente; el botón está deshabilitado
  // si no hay endpoint disponible.
  isEditingName = signal(false);
  editedName    = signal('');

  // Cambio de contraseña
  passForm: FormGroup;
  showCurrent     = signal(false);
  showNew         = signal(false);
  showConfirm     = signal(false);
  isSubmitting    = signal(false);
  passError       = signal('');
  passSuccess     = signal('');

  constructor(
    private auth: AuthService,
    private fb: FormBuilder
  ) {
    this.passForm = this.fb.group(
      {
        current_password: ['', Validators.required],
        new_password:     ['', [Validators.required, Validators.minLength(6)]],
        confirm_password: ['', Validators.required]
      },
      { validators: this.passwordsMatch }
    );
  }

  ngOnInit(): void {
    const u = this.auth.getUserData();
    this.user.set(u);
    this.editedName.set(u?.nombre ?? '');
  }

  get userInitials(): string {
    const name = this.user()?.nombre ?? '';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AX';
  }

  // ── Edición de nombre (placeholder) ──
  startEditName(): void {
    this.editedName.set(this.user()?.nombre ?? '');
    this.isEditingName.set(true);
  }

  cancelEditName(): void {
    this.isEditingName.set(false);
  }

  saveName(): void {
    // TODO: implementar PUT /usuarios/me cuando exista en el backend
    alert('Función de actualizar nombre — pendiente de implementar en el backend.');
    this.isEditingName.set(false);
  }

  // ── Cambio de contraseña ──
  private passwordsMatch(group: FormGroup) {
    const np = group.get('new_password')?.value;
    const cp = group.get('confirm_password')?.value;
    return np === cp ? null : { mismatch: true };
  }

  toggleCurrent() { this.showCurrent.update(v => !v); }
  toggleNew()     { this.showNew.update(v => !v); }
  toggleConfirm() { this.showConfirm.update(v => !v); }

  hasError(field: string): boolean {
    const c = this.passForm.get(field);
    return !!(c && c.invalid && c.touched);
  }

  submitChangePassword(): void {
    this.passError.set('');
    this.passSuccess.set('');

    if (this.passForm.invalid) {
      this.passForm.markAllAsTouched();
      return;
    }

    const { current_password, new_password } = this.passForm.value;
    this.isSubmitting.set(true);

    this.auth.changePassword({ current_password, new_password }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.passSuccess.set('Contraseña actualizada exitosamente.');
        this.passForm.reset();
        setTimeout(() => this.passSuccess.set(''), 3000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.passError.set(err?.error?.detail ?? 'No se pudo cambiar la contraseña.');
      }
    });
  }
}