import { createReducer, on } from '@ngrx/store';
import { IBudget } from '@models/budget.model';
import { BudgetsActions } from './budgets.actions';

export interface BudgetsState {
  items: IBudget[];
  rowMap: Record<string, number>; // budgetId → Sheets row number (1-based, header = row 1)
  loading: boolean;
  error: string | null;
}

const initialState: BudgetsState = {
  items: [],
  rowMap: {},
  loading: false,
  error: null,
};

export const budgetsReducer = createReducer(
  initialState,

  // Load
  on(BudgetsActions.loadBudgets, state => ({ ...state, loading: true, error: null })),
  on(BudgetsActions.loadBudgetsSuccess, (state, { budgets, rowMap }) => ({
    ...state,
    items: budgets,
    rowMap,
    loading: false,
  })),
  on(BudgetsActions.loadBudgetsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Save (append new budget)
  on(BudgetsActions.saveBudget, state => ({ ...state, loading: true })),
  on(BudgetsActions.saveBudgetSuccess, (state, { budget }) => ({
    ...state,
    items: [...state.items, budget],
    loading: false,
  })),
  on(BudgetsActions.saveBudgetFailure, (state, { error, prevItems }) => ({
    ...state,
    items: prevItems,
    loading: false,
    error,
  })),

  // Update (optimistic)
  on(BudgetsActions.updateBudget, state => ({ ...state, loading: true })),
  on(BudgetsActions.updateBudgetSuccess, (state, { budget }) => ({
    ...state,
    items: state.items.map(b => (b.budgetId === budget.budgetId ? budget : b)),
    loading: false,
  })),
  on(BudgetsActions.updateBudgetFailure, (state, { error, prevItems }) => ({
    ...state,
    items: prevItems,
    loading: false,
    error,
  })),

  // Delete (optimistic)
  on(BudgetsActions.deleteBudget, state => ({ ...state, loading: true })),
  on(BudgetsActions.deleteBudgetSuccess, (state, { budgetId }) => ({
    ...state,
    items: state.items.filter(b => b.budgetId !== budgetId),
    loading: false,
  })),
  on(BudgetsActions.deleteBudgetFailure, (state, { error, prevItems }) => ({
    ...state,
    items: prevItems,
    loading: false,
    error,
  })),

  // Recalculate (update existing item)
  on(BudgetsActions.recalculateBudget, state => ({ ...state, loading: true })),
  on(BudgetsActions.recalculateBudgetSuccess, (state, { budget }) => ({
    ...state,
    items: state.items.map(b => (b.budgetId === budget.budgetId ? budget : b)),
    loading: false,
  })),
  on(BudgetsActions.recalculateBudgetFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
);
