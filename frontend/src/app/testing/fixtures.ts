/**
 * Test fixtures derived from real data (tools/data-import/output/).
 * Subset used for unit tests — not full dataset.
 */
import { ITransaction } from '../models/transaction.model';
import { ICategory } from '../models/category.model';
import { IWallet } from '../models/wallet.model';
import { IBudget } from '../models/budget.model';

export const MOCK_CATEGORIES: ICategory[] = [
  {
    categoryId: '10000000-0000-0000-0000-000000000001',
    userId: 'usr_001',
    name: 'Food',
    icon: '🛒',
    color: '#4CAF50',
    type: 'expense',
    budgetAmount: null,
    budgetPeriod: 'monthly',
    isActive: true,
  },
  {
    categoryId: '10000000-0000-0000-0000-00000000000f',
    userId: 'usr_001',
    name: 'Salario',
    icon: '💰',
    color: '#4CAF50',
    type: 'income',
    budgetAmount: null,
    budgetPeriod: 'monthly',
    isActive: true,
  },
];

export const MOCK_WALLETS: IWallet[] = [
  {
    walletId: '10000000-0000-0000-0000-000000000001',
    userId: 'usr_001',
    name: 'Efectivo',
    currency: 'EUR',
    balance: 0,
    color: '#1976D2',
    icon: '💵',
    isDefault: true,
    createdAt: '2026-04-11T19:42:51.027Z',
  },
  {
    walletId: 'wallet-bbva-001',
    userId: 'usr_001',
    name: 'BBVA',
    currency: 'EUR',
    balance: 0,
    color: '#D32F2F',
    icon: '🏦',
    isDefault: false,
    createdAt: '2026-04-11T19:42:51.027Z',
  },
];

export const MOCK_TRANSACTIONS: ITransaction[] = [
  {
    txId: '905725ac-04b0-4e41-9132-f08c24fa94b1',
    userId: 'usr_001',
    walletId: '10000000-0000-0000-0000-000000000001',
    categoryId: '10000000-0000-0000-0000-00000000000d',
    amount: 320.0,
    currency: 'EUR',
    amountBase: 320.0,
    concept: 'Uñas',
    date: '2026-04-11',
    type: 'expense',
    isRecurring: false,
    recurrenceRule: null,
    notes: null,
    createdAt: '2026-04-11T19:42:51.027Z',
    updatedAt: '2026-04-11T19:42:51.027Z',
  },
  {
    txId: 'b1c2d3e4-0000-0000-0000-000000000001',
    userId: 'usr_001',
    walletId: 'wallet-bbva-001',
    categoryId: '10000000-0000-0000-0000-00000000000f',
    amount: 2500.0,
    currency: 'EUR',
    amountBase: 2500.0,
    concept: 'Nómina',
    date: '2026-04-01',
    type: 'income',
    isRecurring: true,
    recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=1',
    notes: null,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
  },
];

export const MOCK_BUDGETS: IBudget[] = [
  {
    budgetId: 'budget-001',
    userId: 'usr_001',
    categoryId: '10000000-0000-0000-0000-000000000001',
    period: '2026-04',
    spentAmount: 320.0,
    budgetAmount: 500.0,
    status: 'ok',
    lastUpdated: '2026-04-11T19:42:51.027Z',
  },
  {
    budgetId: 'budget-002',
    userId: 'usr_001',
    categoryId: '10000000-0000-0000-0000-000000000002',
    period: '2026-04',
    spentAmount: 480.0,
    budgetAmount: 500.0,
    status: 'warning',
    lastUpdated: '2026-04-11T19:42:51.027Z',
  },
];
