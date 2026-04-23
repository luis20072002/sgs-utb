import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';


export const routes: Routes = [
  { path: '', component: Login },
  {path: 'panel', component: DashboardComponent}
  
];