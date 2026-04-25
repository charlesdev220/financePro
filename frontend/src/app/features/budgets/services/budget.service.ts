import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { IBudget } from '@models/budget.model';

// BUDGETS schema (A:H — 8 columnas)
// A: budget_id | B: user_id | C: category_id | D: period (YYYY-MM)
// E: budget_amount | F: spent_amount | G: status | H: last_updated

export function rowToBudget(row: unknown[]): IBudget {
  return {
    budgetId:     String(row[0] ?? ''),
    userId:       String(row[1] ?? ''),
    categoryId:   String(row[2] ?? ''),
    period:       String(row[3] ?? ''),
    budgetAmount: Number(row[4] ?? 0),
    spentAmount:  Number(row[5] ?? 0),
    status:       (String(row[6] ?? 'ok') as 'ok' | 'warning' | 'exceeded'),
    lastUpdated:  String(row[7] ?? new Date().toISOString()),
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
  private readonly sheetsApi = inject(SheetsApiService);

  loadBudgets(): Observable<{ budgets: IBudget[]; rowMap: Record<string, number> }> {
    return this.sheetsApi.getRange('BUDGETS!A:H').pipe(
      map(response => {
        if (!response?.values || response.values.length < 2) {
          return { budgets: [], rowMap: {} };
        }
        const allRows = response.values.slice(1);
        const rowMap: Record<string, number> = {};
        allRows.forEach((row, i) => {
          const id = String(row[0] ?? '');
          if (id) rowMap[id] = i + 2;
        });
        const budgets = allRows
          .filter(row => row[0])
          .map(rowToBudget);
        return { budgets, rowMap };
      }),
    );
  }

  saveBudget(b: IBudget): Observable<unknown> {
    return this.sheetsApi.appendRow('BUDGETS!A1', [budgetToRow(b)]);
  }

  updateBudget(b: IBudget, rowNumber: number): Observable<unknown> {
    return this.sheetsApi.updateRow(
      `BUDGETS!A${rowNumber}:H${rowNumber}`,
      [budgetToRow(b)],
    );
  }

  deleteBudget(rowNumber: number): Observable<unknown> {
    return this.sheetsApi.deleteRow(`BUDGETS!A${rowNumber}:H${rowNumber}`);
  }
}
