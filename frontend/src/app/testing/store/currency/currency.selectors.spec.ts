import { selectBaseCurrency, selectAllCurrencies } from '@store/currency/currency.selectors';
import { CurrencyState } from '@store/currency/currency.reducer';
import { ICurrency } from '@models/currency.model';

const buildState = (partial: Partial<CurrencyState>): { currency: CurrencyState } => ({
  currency: {
    rates: {},
    currencies: [],
    currencyRowMap: {},
    baseCurrency: null,
    baseCurrencyRowNumber: null,
    loading: false,
    error: null,
    ...partial,
  },
});

const mockCurrency = (code: string): ICurrency => ({
  currencyCode: code,
  name: `${code} name`,
  rateToBase: 1,
  lastUpdated: '2026-01-01T00:00:00.000Z',
  source: 'api',
});

// REQ-04
describe('selectBaseCurrency', () => {
  it('returns null in initial state', () => {
    expect(selectBaseCurrency(buildState({}))).toBeNull();
  });

  it('returns the currency code after loadCurrenciesSuccess', () => {
    const state = buildState({ baseCurrency: 'USD' });
    expect(selectBaseCurrency(state)).toBe('USD');
  });
});

describe('selectAllCurrencies', () => {
  it('returns empty array in initial state', () => {
    expect(selectAllCurrencies(buildState({}))).toEqual([]);
  });

  it('returns the currencies array from state', () => {
    const currencies = [mockCurrency('USD'), mockCurrency('EUR')];
    const state = buildState({ currencies });
    expect(selectAllCurrencies(state).length).toBe(2);
    expect(selectAllCurrencies(state)[0].currencyCode).toBe('USD');
  });
});
