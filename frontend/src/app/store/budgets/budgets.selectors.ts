import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BudgetsState } from './budgets.reducer';

export const selectBudgetsState =
  createFeatureSelector<BudgetsState>('budgets');

export const selectAllBudgets = createSelector(
  selectBudgetsState,
  state => state.items
);

export const selectBudgetsLoading = createSelector(
  selectBudgetsState,
  state => state.loading
);

export const selectBudgetsError = createSelector(
  selectBudgetsState,
  state => state.error
);
