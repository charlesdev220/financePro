export const BUDGET_STATUS = {
  OK:       'ok',
  WARNING:  'warning',
  EXCEEDED: 'exceeded',
} as const;

export type BudgetStatus = typeof BUDGET_STATUS[keyof typeof BUDGET_STATUS];
