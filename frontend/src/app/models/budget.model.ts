export interface IBudget {
  budgetId: string;
  userId: string;
  categoryId: string;
  period: string; // Format: YYYY-MM
  spentAmount: number;
  budgetAmount: number;
  status: 'ok' | 'warning' | 'exceeded';
  lastUpdated: string; // ISO 8601 timestamp — set by Apps Script
}
