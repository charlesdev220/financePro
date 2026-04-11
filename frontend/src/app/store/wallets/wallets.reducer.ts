import { createReducer, on } from '@ngrx/store';
import { IWallet } from '../../models/wallet.model';
import { WalletsActions } from './wallets.actions';

export interface WalletsState {
  items: IWallet[];
  loading: boolean;
  error: string | null;
}

const initialState: WalletsState = {
  items: [],
  loading: false,
  error: null,
};

export const walletsReducer = createReducer(
  initialState,
  on(WalletsActions.loadWallets, state => ({ ...state, loading: true, error: null })),
  on(WalletsActions.loadWalletsSuccess, (state, { wallets }) => ({
    ...state,
    items: wallets,
    loading: false,
  })),
  on(WalletsActions.loadWalletsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);
