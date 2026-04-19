import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BudgetsState } from './budgets.reducer';
import { BUDGET_STATUS } from '../../core/constants/budget.constants';

export const selectBudgetsState =
  createFeatureSelector<BudgetsState>('budgets');

export const selectAllBudgets = createSelector(
  selectBudgetsState,
  state => state.items,
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
