import { createFeatureSelector, createSelector } from '@ngrx/store';
import { WalletsState } from './wallets.reducer';

export const selectWalletsState =
  createFeatureSelector<WalletsState>('wallets');

export const selectAllWallets = createSelector(
  selectWalletsState,
  state => state.items
);

export const selectWalletsLoading = createSelector(
  selectWalletsState,
  state => state.loading
);

export const selectWalletsError = createSelector(
  selectWalletsState,
  state => state.error
);
