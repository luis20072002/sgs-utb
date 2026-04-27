// src/app/pages/home/planilla/planilla.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../../services/auth';
import {
  AuxiliarService,
  Planilla,
  Turno,
  Aula
} from '../../../services/auxiliar.service';

@Component({
  selector: 'app-home-planilla',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './planilla.html',
  styleUrls: ['./planilla.css']
})
export class HomePlanillaComponent implements OnInit {
  isLoading = signal(true);
  errorMsg  = signal('');

  planilla = signal<Planilla | null>(null);
  turno    = signal<Turno | null>(null);
  aulas    = signal<Aula[]>([]);

  // Progreso (cuando exista endpoint, reemplazar por datos reales)
  // TODO: GET /registros/mis-registros?fecha=hoy → contar aulas con registro
  aulasCompletadas = signal(0);

  progreso = computed(() => {
    const total = this.aulas().length;
    if (!total) return 0;
    return Math.round((this.aulasCompletadas() / total) * 100);
  });

  constructor(
    private auth: AuthService,
    private auxiliarService: AuxiliarService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUserData();
    if (!user) {
      this.errorMsg.set('No se pudo identificar al usuario.');
      this.isLoading.set(false);
      return;
    }
    this.load(user.id_usuario);
  }

  private load(idUsuario: number): void {
    this.auxiliarService.getPlanillaActiva(idUsuario)
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (planilla) => {
          if (!planilla) {
            this.errorMsg.set('No tienes una planilla activa en este momento.');
            this.isLoading.set(false);
            return;
          }
          this.planilla.set(planilla);
          this.loadDetails(planilla);
        }
      });
  }

  private loadDetails(planilla: Planilla): void {
    forkJoin({
      turno: this.auxiliarService.getTurno(planilla.id_turno).pipe(catchError(() => of(null))),
      aulasP1: this.auxiliarService.getAulasEdificio(planilla.id_edificio, planilla.piso_1)
                   .pipe(catchError(() => of([] as Aula[]))),
      aulasP2: planilla.piso_2
        ? this.auxiliarService.getAulasEdificio(planilla.id_edificio, planilla.piso_2)
              .pipe(catchError(() => of([] as Aula[])))
        : of([] as Aula[]),
      aulasP3: planilla.piso_3
        ? this.auxiliarService.getAulasEdificio(planilla.id_edificio, planilla.piso_3)
              .pipe(catchError(() => of([] as Aula[])))
        : of([] as Aula[])
    }).subscribe(({ turno, aulasP1, aulasP2, aulasP3 }) => {
      this.turno.set(turno);
      this.aulas.set([...aulasP1, ...aulasP2, ...aulasP3]);
      this.isLoading.set(false);
    });
  }

  formatHora(hora?: string | null): string {
    if (!hora) return '—';
    const [h, m] = hora.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  }

  // TODO: implementar cuando se haga el flujo de registro de aula
  registrarAula(aula: Aula): void {
    console.log('Registrar aula:', aula);
    alert(`Registro de aula ${aula.codigo} — pantalla por implementar.`);
  }
}