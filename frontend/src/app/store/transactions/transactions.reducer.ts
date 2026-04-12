import { createReducer, on } from '@ngrx/store';
import { ITransaction } from '../../models/transaction.model';
import { TransactionsActions } from './transactions.actions';

export interface TransactionsState {
  items: ITransaction[];
  rowMap: Record<string, number>; // txId → Sheets row number (1-based, header = row 1)
  loading: boolean;
  error: string | null;
}

const initialState: TransactionsState = {
  items: [],
  rowMap: {},
  loading: false,
  error: null,
};

export const transactionsReducer = createReducer(
  initialState,

  // Load
  on(TransactionsActions.loadTransactions, state => ({ ...state, loading: true, error: null })),
  on(TransactionsActions.loadTransactionsSuccess, (state, { transactions, rowMap }) => ({
    ...state,
    items: transactions,
    rowMap,
    loading: false,
  })),
  on(TransactionsActions.loadTransactionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Add (optimistic: dispatch Success before Sheets confirmation)
  on(TransactionsActions.addTransactionSuccess, (state, { transaction }) => ({
    ...state,
    items: [...state.items, transaction],
    loading: false,
  })),
  on(TransactionsActions.addTransactionFailure, (state, { error, prevItems }) => ({
    ...state,
    items: prevItems,
    loading: false,
    error,
  })),

  // Update (optimistic)
  on(TransactionsActions.updateTransactionSuccess, (state, { transaction }) => ({
    ...state,
    items: state.items.map(t => (t.txId === transaction.txId ? transaction : t)),
  })),
  on(TransactionsActions.updateTransactionFailure, (state, { error, prevItems }) => ({
    ...state,
    items: prevItems,
    error,
  })),

  // Delete (optimistic)
  on(TransactionsActions.deleteTransactionSuccess, (state, { txId }) => ({
    ...state,
    items: state.items.filter(t => t.txId !== txId),
  })),
  on(TransactionsActions.deleteTransactionFailure, (state, { error, prevItems }) => ({
    ...state,
    items: prevItems,
    error,
  })),
);
