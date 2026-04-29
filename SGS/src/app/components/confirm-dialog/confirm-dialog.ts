// src/app/components/confirm-dialog/confirm-dialog.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'confirm-dialog.html',
  styleUrls: ['confirm-dialog.css'],
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = '¿Confirmar acción?';
  @Input() message = '';
  @Input() confirmText = 'Confirmar';
  @Input() cancelText  = 'Cancelar';
  @Input() variant: ConfirmVariant = 'danger';
  @Input() loading = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel  = new EventEmitter<void>();

  get icon(): string {
    return {
      danger:  'warning',
      warning: 'error_outline',
      info:    'info',
    }[this.variant];
  }

  onBackdrop(): void {
    if (!this.loading) this.cancel.emit();
  }

  onConfirm(): void {
    if (!this.loading) this.confirm.emit();
  }
}
