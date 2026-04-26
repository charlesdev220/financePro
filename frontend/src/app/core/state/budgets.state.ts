import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IBudget } from '@models/budget.model';
import { ITransaction } from '@models/transaction.model';
import { BudgetService, calculateStatus } from '@features/budgets/services/budget.service';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

@Injectable({ providedIn: 'root' })
export class BudgetsStateService {
  private readonly budgetService = inject(BudgetService);

  private readonly _items   = signal<IBudget[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error   = signal<string | null>(null);
  private readonly _rowMap  = signal<Record<string, number>>({});

  /** Presupuestos del usuario. */
  readonly items   = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error   = this._error.asReadonly();
  /** Mapa budgetId → número de fila en Sheets. */
  readonly rowMap  = this._rowMap.asReadonly();

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    firstValueFrom(this.budgetService.loadBudgets())
      .then(({ budgets, rowMap }) => {
        this._items.set(budgets);
        this._rowMap.set(rowMap);
      })
      .catch(err => this._error.set(String(err)))
      .finally(() => this._loading.set(false));
  }

  save(budget: IBudget): void {
    const prevItems = this._items();
    this._items.update(items => [...items, budget]);
    firstValueFrom(this.budgetService.saveBudget(budget))
      .catch(err => {
        this._items.set(prevItems);
        this._error.set(String(err));
      });
  }

  update(budget: IBudget, rowNumber: number): void {
    const prevItems = this._items();
    this._items.update(items => items.map(b => b.budgetId === budget.budgetId ? budget : b));
    firstValueFrom(this.budgetService.updateBudget(budget, rowNumber))
      .catch(err => {
        this._items.set(prevItems);
        this._error.set(String(err));
      });
  }

  delete(budgetId: string, rowNumber: number): void {
    const prevItems = this._items();
    this._items.update(items => items.filter(b => b.budgetId !== budgetId));
    firstValueFrom(this.budgetService.deleteBudget(rowNumber))
      .catch(err => {
        this._items.set(prevItems);
        this._error.set(String(err));
      });
  }

  /** Recalcula spentAmount y status para un presupuesto dado.
   *  Recibe las transacciones como parámetro para evitar dependencia circular con TransactionsStateService. */
  recalculate(categoryId: string, period: string, transactions: ITransaction[]): void {
    const budget = this._items().find(b => b.categoryId === categoryId && b.period === period);
    if (!budget) return;
    const rowNumber = this._rowMap()[budget.budgetId];
    if (!rowNumber) return;

    const spentAmount = transactions
      .filter(t =>
        t.type === TRANSACTION_TYPES.EXPENSE &&
        t.categoryId === categoryId &&
        t.date.startsWith(period),
      )
      .reduce((sum, t) => sum + t.amountBase, 0);

    const status = calculateStatus(spentAmount, budget.budgetAmount);
    const updated: IBudget = {
      ...budget,
      spentAmount,
      status,
      lastUpdated: new Date().toISOString(),
    };

    this._items.update(items => items.map(b => b.budgetId === updated.budgetId ? updated : b));
    firstValueFrom(this.budgetService.updateBudget(updated, rowNumber))
      .catch(err => this._error.set(String(err)));
  }
}
