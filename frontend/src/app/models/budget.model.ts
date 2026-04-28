import { BudgetMode } from '@core/constants/workspace.constants';

export interface IBudget {
  budgetId: string;
  userId: string;
  categoryId: string;
  period: string;           // Format: YYYY-MM
  spentAmount: number;
  budgetAmount: number;
  status: 'ok' | 'warning' | 'exceeded';
  lastUpdated: string;      // ISO 8601 timestamp
  workspaceId: string;
  mode: BudgetMode;
  startDate?: string;       // ISO 8601 date, requerido si mode === 'period'
  endDate?: string;         // ISO 8601 date, requerido si mode === 'period'
}
