// src/app/components/header-admin/header-admin.ts
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface HeaderUser {
  nombre: string;
  correo: string;
  rol: string;
}

@Component({
  selector: 'app-header-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'header-admin.html',
  styleUrls: ['header-admin.css']
})
export class HeaderAdminComponent {
  @Input() user: HeaderUser | null = null;
  @Input() pageTitle: string = 'Panel de Administrador';
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  menuOpen = signal(false);

  get currentDate(): string {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  get userInitials(): string {
    if (!this.user?.nombre) return '?';
    const parts = this.user.nombre.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onLogout(): void {
    this.closeMenu();
    this.logout.emit();
  }
}
