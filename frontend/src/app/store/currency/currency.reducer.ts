import { createReducer, on } from '@ngrx/store';
import { CurrencyActions } from './currency.actions';

export interface CurrencyRateEntry {
  rate: number;
  lastUpdated: string; // ISO 8601 timestamp
}

export interface CurrencyState {
  rates: Record<string, CurrencyRateEntry>; // key: 'FROM_TO'
  loading: boolean;
  error: string | null;
}

const initialState: CurrencyState = {
  rates: {},
  loading: false,
  error: null,
};

export const currencyReducer = createReducer(
  initialState,
  on(CurrencyActions.loadRate, state => ({ ...state, loading: true, error: null })),
  on(CurrencyActions.loadRateSuccess, (state, { from, to, rate }) => ({
    ...state,
    loading: false,
    rates: {
      ...state.rates,
      [`${from}_${to}`]: { rate, lastUpdated: new Date().toISOString() },
    },
  })),
  on(CurrencyActions.loadRateFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
);
