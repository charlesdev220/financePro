import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IBudget } from '@models/budget.model';
import { ITransaction } from '@models/transaction.model';
import { BudgetService, calculateStatus } from '@features/budgets/services/budget.service';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';
import { BUDGET_MODES } from '@core/constants/workspace.constants';

@Injectable({ providedIn: 'root' })
export class BudgetsStateService {
  private readonly budgetService = inject(BudgetService);
  private readonly workspacesState = inject(WorkspacesStateService);

  private readonly _allItems = signal<IBudget[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _rowMap = signal<Record<string, number>>({});

  /** Presupuestos del workspace activo. */
  readonly items = computed(() =>
    this._allItems().filter(b => b.workspaceId === this.workspacesState.activeWorkspaceId()),
  );
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  /** Mapa budgetId → número de fila en Sheets. */
  readonly rowMap = this._rowMap.asReadonly();

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    firstValueFrom(this.budgetService.loadBudgets(this.workspacesState.defaultWorkspaceId()))
      .then(({ budgets, rowMap }) => {
        this._allItems.set(budgets);
        this._rowMap.set(rowMap);
      })
      .catch(err => this._error.set(String(err)))
      .finally(() => this._loading.set(false));
  }

  save(budget: IBudget): void {
    const prevItems = this._allItems();
    this._allItems.update(items => [...items, budget]);
    firstValueFrom(this.budgetService.saveBudget(budget))
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }

  update(budget: IBudget, rowNumber: number): void {
    const prevItems = this._allItems();
    this._allItems.update(items => items.map(b => b.budgetId === budget.budgetId ? budget : b));
    firstValueFrom(this.budgetService.updateBudget(budget, rowNumber))
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }

  delete(budgetId: string, rowNumber: number): void {
    const prevItems = this._allItems();
    this._allItems.update(items => items.filter(b => b.budgetId !== budgetId));
    firstValueFrom(this.budgetService.deleteBudget(rowNumber))
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }

  /** Recalcula spentAmount y status para un presupuesto dado.
   *  Recibe las transacciones como parámetro para evitar dependencia circular con TransactionsStateService.
   *  Opera sobre _allItems para no perder datos cross-workspace. */
  recalculate(categoryId: string, period: string, transactions: ITransaction[]): void {
    const budget = this._allItems().find(b => b.categoryId === categoryId && b.period === period);
    if (!budget) return;
    const rowNumber = this._rowMap()[budget.budgetId];
    if (!rowNumber) return;

    const spentAmount = this._calcSpent(categoryId, period, transactions);
    const status = calculateStatus(spentAmount, budget.budgetAmount);
    const updated: IBudget = {
      ...budget,
      spentAmount,
      status,
      lastUpdated: new Date().toISOString(),
    };

    this._allItems.update(items => items.map(b => b.budgetId === updated.budgetId ? updated : b));
    firstValueFrom(this.budgetService.updateBudget(updated, rowNumber))
      .catch(err => this._error.set(String(err)));
  }

  /**
   * Crea el registro BUDGET para la categoría+período si no existe todavía.
   * Si ya existe un registro (configurado manualmente desde el tab Presupuestos),
   * lo respeta sin modificar su budgetAmount — solo recalcula spentAmount.
   * Opera sobre _allItems para no perder datos cross-workspace.
   */
  createOrRecalculate(
    categoryId: string,
    period: string,
    defaultBudgetAmount: number,
    userId: string,
    transactions: ITransaction[],
  ): void {
    const existing = this._allItems().find(b => b.categoryId === categoryId && b.period === period);
    const spentAmount = this._calcSpent(categoryId, period, transactions);

    if (existing) {
      // Respeta el budgetAmount ya configurado; solo actualiza spentAmount si está desactualizado
      if (existing.spentAmount === spentAmount) return;
      const rowNumber = this._rowMap()[existing.budgetId];
      if (!rowNumber) return;
      const status = calculateStatus(spentAmount, existing.budgetAmount);
      const updated: IBudget = { ...existing, spentAmount, status, lastUpdated: new Date().toISOString() };
      this._allItems.update(items => items.map(b => b.budgetId === existing.budgetId ? updated : b));
      firstValueFrom(this.budgetService.updateBudget(updated, rowNumber))
        .catch(err => this._error.set(String(err)));
    } else {
      // No existe → crear con el amount por defecto de la categoría
      const status = calculateStatus(spentAmount, defaultBudgetAmount);
      const newBudget: IBudget = {
        budgetId: `bgt_${crypto.randomUUID()}`,
        userId,
        categoryId,
        period,
        budgetAmount: defaultBudgetAmount,
        spentAmount,
        status,
        lastUpdated: new Date().toISOString(),
        workspaceId: this.workspacesState.activeWorkspaceId(),
        mode: BUDGET_MODES.INDEFINITE,
        startDate: undefined,
        endDate: undefined,
      };
      this.save(newBudget);
    }
  }

  private _calcSpent(categoryId: string, period: string, transactions: ITransaction[]): number {
    return transactions
      .filter(t =>
        t.type === TRANSACTION_TYPES.EXPENSE &&
        t.categoryId === categoryId &&
        t.date.startsWith(period),
      )
      .reduce((sum, t) => sum + t.amountBase, 0);
  }
}
