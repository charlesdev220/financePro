import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.page').then(m => m.DashboardPage),
  },
  {
    path: 'transactions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/transactions/transactions.page').then(m => m.TransactionsPage),
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/categories/categories.page').then(m => m.CategoriesPage),
  },
  {
    path: 'wallets',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/wallets/wallets.page').then(m => m.WalletsPage),
  },
  {
    path: 'budgets',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/budgets/budgets.page').then(m => m.BudgetsPage),
  },
  {
    path: 'analytics',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/analytics/analytics.page').then(m => m.AnalyticsPage),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/settings.page').then(m => m.SettingsPage),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
