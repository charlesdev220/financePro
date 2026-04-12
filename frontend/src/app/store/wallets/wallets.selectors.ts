import { createFeatureSelector, createSelector } from '@ngrx/store';
import { WalletsState } from './wallets.reducer';
import { selectAllTransactions } from '../transactions/transactions.selectors';

export const selectWalletsState = createFeatureSelector<WalletsState>('wallets');

export const selectAllWallets = createSelector(selectWalletsState, state => state.items);

export const selectWalletsRowMap = createSelector(selectWalletsState, state => state.rowMap);

export const selectWalletsLoading = createSelector(selectWalletsState, state => state.loading);

export const selectWalletsError = createSelector(selectWalletsState, state => state.error);

export const selectWalletById = (walletId: string) =>
  createSelector(selectAllWallets, wallets =>
    wallets.find(w => w.walletId === walletId) ?? null,
  );

/**
 * Calcula el balance de una cartera sumando las transacciones del store.
 * income (+) y expense (-). Usa `amount` (divisa nativa de la cartera), no amountBase.
 * ADR-04: Balance calculado en store NgRx sin llamada extra a Sheets.
 */
export const selectBalanceForWallet = (walletId: string) =>
  createSelector(selectAllTransactions, transactions =>
    transactions
      .filter(t => t.walletId === walletId)
      .reduce(
        (balance, t) => (t.type === 'income' ? balance + t.amount : balance - t.amount),
        0,
      ),
  );
