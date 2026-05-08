// src/app/pages/home/home.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService, UserProfile } from '../../services/auth';

interface NavItem {
  id:    string;
  label: string;
  icon:  string;
  path:  string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {
  user = signal<UserProfile | null>(null);
  showUserMenu = signal(false);

  // Items de navegación. El orden importa: aparecen así tanto arriba (desktop)
  // como abajo (mobile).
  readonly navItems: NavItem[] = [
    { id: 'dashboard',   label: 'Inicio',      icon: 'home',                path: '/home' },
    { id: 'planilla',    label: 'Planilla',    icon: 'assignment',          path: '/home/planilla' },
    { id: 'solicitudes', label: 'Solicitudes', icon: 'help_outline',        path: '/home/solicitudes' },
    { id: 'novedades',   label: 'Novedades',   icon: 'notifications_none',  path: '/home/novedades' },
    { id: 'horario',     label: 'Horario',     icon: 'calendar_month',      path: '/home/horario' },
    { id: 'perfil',      label: 'Perfil',      icon: 'person_outline',      path: '/home/perfil' },
  ];

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.user.set(this.auth.getUserData());
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

  toggleUserMenu(): void {
    this.showUserMenu.update(v => !v);
  }

  closeUserMenu(): void {
    this.showUserMenu.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}