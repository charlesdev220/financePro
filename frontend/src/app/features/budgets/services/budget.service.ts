import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
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

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly sheetsApi   = inject(SheetsApiService);
  private readonly authService = inject(AuthService);

  loadBudgets(defaultWsId = ''): Observable<{ budgets: IBudget[]; rowMap: Record<string, number> }> {
    return this.sheetsApi.getRange('BUDGETS!A:L').pipe(
      map(response => {
        if (!response?.values || response.values.length < 2) {
          return { budgets: [], rowMap: {} };
        }
        const allRows  = response.values.slice(1);
        const userId   = this.authService.getUser()?.sub ?? '';
        const rowMap: Record<string, number> = {};
        allRows.forEach((row, i) => {
          const id  = String(row[0] ?? '');
          const uid = String(row[1] ?? '');
          if (id && uid === userId) rowMap[id] = i + 2;
        });
        const budgets = allRows
          .filter(row => row[0] && String(row[1] ?? '') === userId)
          .map(row => rowToBudget(row, defaultWsId));
        return { budgets, rowMap };
      }),
    );
  }

  saveBudget(b: IBudget): Observable<unknown> {
    return this.sheetsApi.appendRow('BUDGETS!A1', [budgetToRow(b)]);
  }

  updateBudget(b: IBudget, rowNumber: number): Observable<unknown> {
    return this.sheetsApi.updateRow(
      `BUDGETS!A${rowNumber}:L${rowNumber}`,
      [budgetToRow(b)],
    );
  }

  deleteBudget(rowNumber: number): Observable<unknown> {
    return this.sheetsApi.deleteRow(`BUDGETS!A${rowNumber}:L${rowNumber}`);
  }
}
