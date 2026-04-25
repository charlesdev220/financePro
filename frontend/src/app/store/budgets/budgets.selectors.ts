import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BudgetsState } from './budgets.reducer';
import { BUDGET_STATUS, BudgetStatus } from '@core/constants/budget.constants';
import { selectAllTransactions } from '@store/transactions/transactions.selectors';
import { IBudget } from '@models/budget.model';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

export const selectBudgetsState =
  createFeatureSelector<BudgetsState>('budgets');

/** Lista base de presupuestos desde el store. */
export const selectRawBudgets = createSelector(
  selectBudgetsState,
  state => state.items,
);

/** 
 * Selector maestro que calcula el gasto real (spentAmount) y el estado (status) 
 * de cada presupuesto cruzando los datos con las transacciones actuales del store.
 */
export const selectAllBudgets = createSelector(
  selectRawBudgets,
  selectAllTransactions,
  (budgets, transactions): IBudget[] => {
    return budgets.map(budget => {
      // Filtrar gastos de la misma categoría y período
      const spent = transactions
        .filter(t => 
          t.categoryId === budget.categoryId && 
          t.date.startsWith(budget.period) &&
          t.type === TRANSACTION_TYPES.EXPENSE
        )
        .reduce((sum, t) => sum + t.amountBase, 0);

      // Determinar el nuevo estado
      let status: BudgetStatus = BUDGET_STATUS.OK;
      if (spent > budget.budgetAmount) {
        status = BUDGET_STATUS.EXCEEDED;
      } else if (spent > budget.budgetAmount * 0.8) {
        status = BUDGET_STATUS.WARNING;
      }

      return {
        ...budget,
        spentAmount: spent,
        status: status
      };
    });
  }
);

export const selectBudgetsRowMap = createSelector(
  selectBudgetsState,
  state => state.rowMap,
);

export const selectBudgetsLoading = createSelector(
  selectBudgetsState,
  state => state.loading,
);

export const selectBudgetsError = createSelector(
  selectBudgetsState,
  state => state.error,
);

export const selectBudgetForCategory = (categoryId: string, period: string) =>
  createSelector(selectAllBudgets, budgets =>
    budgets.find(b => b.categoryId === categoryId && b.period === period) ?? null,
  );

export const selectBudgetsForPeriod = (period: string) =>
  createSelector(selectAllBudgets, budgets =>
    budgets.filter(b => b.period === period),
  );

export const selectExceededBudgets = (period: string) =>
  createSelector(selectAllBudgets, budgets =>
    budgets.filter(b => b.period === period && b.status === BUDGET_STATUS.EXCEEDED),
  );
