// src/app/models/planilla.model.ts

export interface Planilla {
  id_planillas: number;
  id_usuario: number;
  id_turno: number;
  id_edificio: number;
  piso_1: number;
  piso_2: number | null;
  piso_3: number | null;
  periodo_vigencia: string;
  estado: 'activa' | 'inactiva';
  fecha_asignacion: string;
}

export interface PlanillaCreate {
  id_usuario: number;
  id_turno: number;
  id_edificio: number;
  piso_1: number;
  piso_2?: number | null;
  piso_3?: number | null;
  periodo_vigencia: string;
  fecha_asignacion: string; // date string YYYY-MM-DD
}

export interface PlanillaUpdate {
  estado?: 'activa' | 'inactiva';
  piso_1?: number;
  piso_2?: number | null;
  piso_3?: number | null;
}

export interface HorarioClase {
  id_horario_clase: number;
  id_planilla: number;
  id_aula: number;
  id_docente: number;
  id_curso: number;
  hora_inicio: string;
  hora_fin: string;
  dia_semana: number | null;
}

export interface HorarioClaseCreate {
  id_planilla: number;
  id_aula: number;
  id_docente: number;
  id_curso: number;
  hora_inicio: string;
  hora_fin: string;
  dia_semana?: number | null;
}

export interface HorarioClaseUpdate {
  id_aula?: number;
  id_docente?: number;
  id_curso?: number;
  hora_inicio?: string;
  hora_fin?: string;
  dia_semana?: number | null;
}

// ── Tipos enriquecidos para la UI ───────────────────────────

export interface PlanillaEnriquecida extends Planilla {
  nombreEdificio?: string;
  nombreTurno?: string;
  nombreAuxiliar?: string;
  pisos: number[];
}