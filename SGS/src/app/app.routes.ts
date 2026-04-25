import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { AdminPanelComponent } from './pages/admin-panel/admin-panel';
import { HomeComponent } from './pages/home/home';
import { UsersComponent } from './pages/admin-panel/users/users';

export const routes: Routes = [
  { path: '', component: Login },
  {
    path: 'adminPanel',
    component: AdminPanelComponent,
    children: [
      { path: 'users', component: UsersComponent }
    ]
  },
  {
    path: 'home',
    component: HomeComponent,
  },
  { path: '**', redirectTo: '' }
];
