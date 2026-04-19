import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/register/register.page').then(m => m.RegisterPage),
  },
  {
    path: 'tabs',
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
