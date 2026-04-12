import { createReducer, on } from '@ngrx/store';
import { IWallet } from '../../models/wallet.model';
import { WalletsActions } from './wallets.actions';

export interface WalletsState {
  items: IWallet[];
  rowMap: Record<string, number>; // walletId → Sheets row number
  loading: boolean;
  error: string | null;
}

const initialState: WalletsState = {
  items: [],
  rowMap: {},
  loading: false,
  error: null,
};

export const walletsReducer = createReducer(
  initialState,

  // Load
  on(WalletsActions.loadWallets, state => ({ ...state, loading: true, error: null })),
  on(WalletsActions.loadWalletsSuccess, (state, { wallets, rowMap }) => ({
    ...state,
    items: wallets,
    rowMap,
    loading: false,
  })),
  on(WalletsActions.loadWalletsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Add (optimistic)
  on(WalletsActions.addWalletSuccess, (state, { wallet }) => ({
    ...state,
    items: [...state.items, wallet],
    loading: false,
  })),
  on(WalletsActions.addWalletFailure, (state, { error, prevItems }) => ({
    ...state,
    items: prevItems,
    loading: false,
    error,
  })),

  // Update (optimistic)
  on(WalletsActions.updateWalletSuccess, (state, { wallet }) => ({
    ...state,
    items: state.items.map(w => (w.walletId === wallet.walletId ? wallet : w)),
  })),
  on(WalletsActions.updateWalletFailure, (state, { error, prevItems }) => ({
    ...state,
    items: prevItems,
    error,
  })),

  // Delete (optimistic)
  on(WalletsActions.deleteWalletSuccess, (state, { walletId }) => ({
    ...state,
    items: state.items.filter(w => w.walletId !== walletId),
  })),
  on(WalletsActions.deleteWalletFailure, (state, { error, prevItems }) => ({
    ...state,
    items: prevItems,
    error,
  })),
);
