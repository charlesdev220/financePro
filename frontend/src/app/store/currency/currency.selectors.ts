import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CurrencyState } from './currency.reducer';

const ONE_HOUR_MS = 60 * 60 * 1000;

export const selectCurrencyState = createFeatureSelector<CurrencyState>('currency');

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
