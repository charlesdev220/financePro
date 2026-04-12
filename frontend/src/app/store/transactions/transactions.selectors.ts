import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TransactionsState } from './transactions.reducer';

export const selectTransactionsState =
  createFeatureSelector<TransactionsState>('transactions');

export const selectAllTransactions = createSelector(
  selectTransactionsState,
  state => state.items,
);

export const selectTransactionsRowMap = createSelector(
  selectTransactionsState,
  state => state.rowMap,
);

export const selectTransactionsLoading = createSelector(
  selectTransactionsState,
  state => state.loading,
);

export const selectTransactionsError = createSelector(
  selectTransactionsState,
  state => state.error,
);

export const selectByUser = (userId: string) =>
  createSelector(selectAllTransactions, txs =>
    txs.filter(t => t.userId === userId),
  );

export const selectByWallet = (walletId: string) =>
  createSelector(selectAllTransactions, txs =>
    txs.filter(t => t.walletId === walletId),
  );

export const selectByCategory = (categoryId: string) =>
  createSelector(selectAllTransactions, txs =>
    txs.filter(t => t.categoryId === categoryId),
  );

export const selectByDateRange = (from: string, to: string) =>
  createSelector(selectAllTransactions, txs =>
    txs.filter(t => t.date >= from && t.date <= to),
  );
