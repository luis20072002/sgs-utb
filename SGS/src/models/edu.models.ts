// src/models/edu.models.ts
export type UserRole = 'administrador' | 'auxiliar';
 
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}
 
export interface KPIStats {
  totalUsers: number;
  totalDocentes: number;
  totalAuxiliares: number;
  totalReports: number;
  totalProyectoresFallando: number;
  totalProfesoresNoAsistieron: number;
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
  icon: string;
  label: string;
  path: string;
}
 
export interface ChartData {
  label: string;
  value: number;
  color: string;
}
