import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';

const DIAS: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo'
};

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedules.html',
  styleUrls: ['./schedules.css']
})
export class SchedulesComponent implements OnInit {
  horarios:  any[] = [];
  usuarios:  any[] = [];
  isLoading = signal(true);
  errorMsg  = signal('');

  constructor(private userService: UserService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.errorMsg.set('');

    this.userService.getHorarios().subscribe({
      next: (data) => {
        this.horarios = data;
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudieron cargar los horarios.');
        this.isLoading.set(false);
      }
    });
  }

  diaNombre(num: number): string {
    return DIAS[num] ?? `Día ${num}`;
  }

  // Agrupar por usuario
  get horariosAgrupados(): { usuario: string; id: number; dias: any[] }[] {
    const map = new Map<number, any>();
    for (const h of this.horarios) {
      if (!map.has(h.id_usuario)) {
        map.set(h.id_usuario, { usuario: `Usuario #${h.id_usuario}`, id: h.id_usuario, dias: [] });
      }
      map.get(h.id_usuario).dias.push(h);
    }
    return Array.from(map.values());
  }
}
