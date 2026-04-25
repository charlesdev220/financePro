import { createFeature, createReducer, on } from '@ngrx/store';
import { CurrencyActions } from './currency.actions';
import { ICurrency } from '@models/currency.model';

export interface CurrencyRateEntry {
  rate: number;
  lastUpdated: string; // ISO 8601 timestamp
}

export interface CurrencyState {
  rates: Record<string, CurrencyRateEntry>; // key: 'FROM_TO' — existing in-memory cache
  currencies: ICurrency[];                   // persisted in CURRENCIES sheet
  currencyRowMap: Record<string, number>;    // currencyCode → Sheets row number
  baseCurrency: string | null;               // from USER_SETTINGS key='base_currency'
  baseCurrencyRowNumber: number | null;      // row in USER_SETTINGS for upsert
  loading: boolean;
  error: string | null;
}

const initialState: CurrencyState = {
  rates: {},
  currencies: [],
  currencyRowMap: {},
  baseCurrency: null,
  baseCurrencyRowNumber: null,
  loading: false,
  error: null,
};

export const currencyFeature = createFeature({
  name: 'currency',
  reducer: createReducer(
    initialState,

    // Existing handlers — do not modify
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

    // Load currencies from Sheets
    on(CurrencyActions.loadCurrencies, state => ({ ...state, loading: true, error: null })),
    on(CurrencyActions.loadCurrenciesSuccess, (state, { currencies, currencyRowMap, baseCurrency, baseCurrencyRowNumber }) => ({
      ...state,
      currencies,
      currencyRowMap,
      baseCurrency,
      baseCurrencyRowNumber,
      loading: false,
      error: null,
    })),
    on(CurrencyActions.loadCurrenciesFailure, (state, { error }) => ({
      ...state,
      loading: false,
      error,
    })),

    // Fetch from API + persist
    on(CurrencyActions.fetchAndPersistRate, state => ({ ...state, loading: true, error: null })),
    on(CurrencyActions.fetchAndPersistRateSuccess, (state, { currency, rowNumber }) => {
      const exists = state.currencies.some(c => c.currencyCode === currency.currencyCode);
      return {
        ...state,
        loading: false,
        currencies: exists
          ? state.currencies.map(c => c.currencyCode === currency.currencyCode ? currency : c)
          : [...state.currencies, currency],
        currencyRowMap: { ...state.currencyRowMap, [currency.currencyCode]: rowNumber },
      };
    }),
    on(CurrencyActions.fetchAndPersistRateFailure, (state, { error }) => ({
      ...state,
      loading: false,
      error,
    })),

    // Save manual rate
    on(CurrencyActions.saveCurrency, state => ({ ...state, loading: true, error: null })),
    on(CurrencyActions.saveCurrencySuccess, (state, { currency, rowNumber }) => {
      const exists = state.currencies.some(c => c.currencyCode === currency.currencyCode);
      return {
        ...state,
        loading: false,
        currencies: exists
          ? state.currencies.map(c => c.currencyCode === currency.currencyCode ? currency : c)
          : [...state.currencies, currency],
        currencyRowMap: { ...state.currencyRowMap, [currency.currencyCode]: rowNumber },
      };
    }),
    on(CurrencyActions.saveCurrencyFailure, (state, { error }) => ({
      ...state,
      loading: false,
      error,
    })),

    // Set base currency
    on(CurrencyActions.setBaseCurrency, state => ({ ...state, loading: true, error: null })),
    on(CurrencyActions.setBaseCurrencySuccess, (state, { currencyCode, rowNumber }) => ({
      ...state,
      loading: false,
      baseCurrency: currencyCode,
      baseCurrencyRowNumber: rowNumber,
    })),
    on(CurrencyActions.setBaseCurrencyFailure, (state, { error }) => ({
      ...state,
      loading: false,
      error,
    })),
  ),
});

export const currencyReducer = currencyFeature.reducer;
