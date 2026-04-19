import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/register/register.page').then(m => m.RegisterPage),
  },
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tabs/tabs.page').then(m => m.TabsPage),
    loadChildren: () =>
      import('./features/tabs/tabs.routes').then(m => m.tabsRoutes),
  },
  {
    path: '**',
    redirectTo: 'tabs',
  },
];
