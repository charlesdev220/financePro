import { IBudget } from '@models/budget.model';
import { BUDGET_MODES, BudgetMode } from '@core/constants/workspace.constants';

// BUDGETS schema (A:L — 12 columnas)
// A: budget_id | B: user_id | C: category_id | D: period (YYYY-MM)
// E: budget_amount | F: spent_amount | G: status | H: last_updated
// I: workspace_id | J: mode | K: start_date | L: end_date

export function rowToBudget(row: unknown[], defaultWsId = ''): IBudget {
  return {
    budgetId:     String(row[0] ?? ''),
    userId:       String(row[1] ?? ''),
    categoryId:   String(row[2] ?? ''),
    period:       String(row[3] ?? ''),
    budgetAmount: Number(row[4] ?? 0),
    spentAmount:  Number(row[5] ?? 0),
    status:       (String(row[6] ?? 'ok') as 'ok' | 'warning' | 'exceeded'),
    lastUpdated:  String(row[7] ?? new Date().toISOString()),
    workspaceId:  String(row[8] || defaultWsId),
    mode:         ((String(row[9] ?? '') as BudgetMode) || BUDGET_MODES.INDEFINITE),
    startDate:    row[10] ? String(row[10]) : undefined,
    endDate:      row[11] ? String(row[11]) : undefined,
  };
}

export function budgetToRow(b: IBudget): unknown[] {
  return [
    b.budgetId,
    b.userId,
    b.categoryId,
    b.period,
    b.budgetAmount,
    b.spentAmount,
    b.status,
    b.lastUpdated,
    b.workspaceId,
    b.mode,
    b.startDate ?? '',
    b.endDate ?? '',
  ];
}

/**
 * Calcula el status de un presupuesto de forma pura:
 * - ok       → spentAmount < 80% de budgetAmount
 * - warning  → 80% <= spentAmount < 100%
 * - exceeded → spentAmount >= 100%
 */
export function calculateStatus(
  spentAmount: number,
  budgetAmount: number,
): 'ok' | 'warning' | 'exceeded' {
  if (budgetAmount <= 0) return 'exceeded';
  const ratio = spentAmount / budgetAmount;
  if (ratio >= 1) return 'exceeded';
  if (ratio >= 0.8) return 'warning';
  return 'ok';
}
