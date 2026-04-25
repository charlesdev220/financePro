import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CurrencyState } from './currency.reducer';

const ONE_HOUR_MS = 60 * 60 * 1000;

export const selectCurrencyState = createFeatureSelector<CurrencyState>('currency');

// Existing selectors — do not remove
export const selectAllRates = createSelector(selectCurrencyState, state => state.rates);

export const selectRateEntry = (from: string, to: string) =>
  createSelector(selectAllRates, rates => rates[`${from}_${to}`] ?? null);

export const selectRate = (from: string, to: string) =>
  createSelector(selectRateEntry(from, to), entry => entry?.rate ?? null);

export const selectRateIsStale = (from: string, to: string) =>
  createSelector(selectRateEntry(from, to), entry => {
    if (!entry) return true;
    return Date.now() - new Date(entry.lastUpdated).getTime() > ONE_HOUR_MS;
  });

// New selectors for persisted currencies
export const selectAllCurrencies = createSelector(
  selectCurrencyState,
  state => state.currencies,
);

export const selectBaseCurrency = createSelector(
  selectCurrencyState,
  state => state.baseCurrency,
);

export const selectCurrencyRowMap = createSelector(
  selectCurrencyState,
  state => state.currencyRowMap,
);

export const selectCurrenciesLoading = createSelector(
  selectCurrencyState,
  state => state.loading,
);

export const selectCurrencyByCode = (code: string) =>
  createSelector(selectAllCurrencies, currencies =>
    currencies.find(c => c.currencyCode === code) ?? null,
  );
