import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../models/edu.models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'header.html',
  styleUrls: ['header.css']
})
export class HeaderComponent {
  @Input() user!: User;
  @Output() logout = new EventEmitter<void>();

  isProfileOpen = false;

  toggleProfile(): void {
    this.isProfileOpen = !this.isProfileOpen;
  }

  closeProfile(): void {
    this.isProfileOpen = false;
  }

  onLogout(): void {
    this.isProfileOpen = false;
    this.logout.emit();
  }

  get userInitials(): string {
    return this.user?.name
      ? this.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      : 'AD';
  }
}