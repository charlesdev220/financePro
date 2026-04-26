import { Routes } from '@angular/router';

export const tabsRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('@shared/components/share-header/share-header.component')
        .then(m => m.ShareHeaderComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../dashboard/dashboard.page').then(m => m.DashboardPage),
      },
    ],
  },
  {
    path: 'transactions',
    loadComponent: () =>
      import('../transactions/transaction-list/transaction-list.page').then(m => m.TransactionListPage),
  },
  {
    path: 'budgets',
    loadComponent: () =>
      import('../budgets/budget-list/budget-list.page').then(m => m.BudgetListPage),
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('../analytics/analytics.page').then(m => m.AnalyticsPage),
  },
  {
    path: 'more',
    loadComponent: () =>
      import('../more/more.page').then(m => m.MorePage),
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('../categories/category-list/category-list.page').then(m => m.CategoryListPage),
  },
  {
    path: 'wallets',
    loadComponent: () =>
      import('../wallets/wallet-list/wallet-list.page').then(m => m.WalletListPage),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('../settings/settings.page').then(m => m.SettingsPage),
  },
  {
    path: 'currencies',
    loadComponent: () =>
      import('../settings/currency-settings/currency-settings.page').then(m => m.CurrencySettingsPage),
  },
];
