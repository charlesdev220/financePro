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
      import('./features/transactions/transaction-list/transaction-list.page').then(
        m => m.TransactionListPage,
      ),
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/categories/category-list/category-list.page').then(
        m => m.CategoryListPage,
      ),
  },
  {
    path: 'wallets',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/wallets/wallet-list/wallet-list.page').then(
        m => m.WalletListPage,
      ),
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
    path: '**',
    redirectTo: 'dashboard',
  },
];
