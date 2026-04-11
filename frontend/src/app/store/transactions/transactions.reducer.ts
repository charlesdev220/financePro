import { createReducer, on } from '@ngrx/store';
import { ITransaction } from '../../models/transaction.model';
import { TransactionsActions } from './transactions.actions';

export interface TransactionsState {
  items: ITransaction[];
  loading: boolean;
  error: string | null;
}

const initialState: TransactionsState = {
  items: [],
  loading: false,
  error: null,
};

export const transactionsReducer = createReducer(
  initialState,
  on(TransactionsActions.loadTransactions, state => ({ ...state, loading: true, error: null })),
  on(TransactionsActions.loadTransactionsSuccess, (state, { transactions }) => ({
    ...state,
    items: transactions,
    loading: false,
  })),
  on(TransactionsActions.loadTransactionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);
