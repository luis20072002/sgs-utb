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