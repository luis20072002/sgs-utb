export interface User {
  id: string;
  name: string;
  email: string;
  role: 'administrador' | 'usuario';
  avatar?: string;
}
 
export interface KPIStats {
  totalUsers: number;
  totalTeachers: number;
  totalCourses: number;
  totalClassrooms: number;
  totalShifts: number;
  totalTemplates: number;
}
 
export interface ActivityLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete' | 'assign';
}
 
export interface Alert {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'error';
  timestamp: string;
}
 
export interface MenuItem {
  id: string;
  icon: string;   // nombre de icono (Material Icons o SVG inline)
  label: string;
  path: string;}


  // ── Reemplazar / actualizar en: src/models/edu.models.ts ──────────
// La interfaz AulaCheck ahora tiene campos adicionales.
// Reemplaza la versión anterior si ya la tenías del v1.

export interface AulaCheck {
  id: string;
  aulaNombre: string;
  docenteNombre: string;
  nombreClase: string;             // NUEVO: nombre de la materia
  codigoClase: string;             // NUEVO: código ej. "ALG-101"
  estudiantesMatriculados: number; // NUEVO: cantidad matriculada
  horaInicio: string;              // NUEVO: formato "HH:mm"
  asistenciaDocente: boolean;
  novedades: string;
  completado: boolean;
}

export interface PlanillaTrabajo {
  id: string;
  edificio: string;
  turno: string;
  auxiliarId: string;
  fecha: string;
  aulas: AulaCheck[];
}

// Actualizar también la interfaz User para incluir el rol 'auxiliar':
// export interface User {
//   id: string;
//   name: string;
//   email: string;
//   role: 'administrador' | 'auxiliar' | 'docente' | 'estudiante';
//   avatar?: string;
// }