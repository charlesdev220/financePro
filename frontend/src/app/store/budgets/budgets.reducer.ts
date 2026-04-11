import { createReducer, on } from '@ngrx/store';
import { IBudget } from '../../models/budget.model';
import { BudgetsActions } from './budgets.actions';

export interface BudgetsState {
  items: IBudget[];
  loading: boolean;
  error: string | null;
}

const initialState: BudgetsState = {
  items: [],
  loading: false,
  error: null,
};

export const budgetsReducer = createReducer(
  initialState,
  on(BudgetsActions.loadBudgets, state => ({ ...state, loading: true, error: null })),
  on(BudgetsActions.loadBudgetsSuccess, (state, { budgets }) => ({
    ...state,
    items: budgets,
    loading: false,
  })),
  on(BudgetsActions.loadBudgetsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);
