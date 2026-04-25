import { currencyReducer, CurrencyState } from '@store/currency/currency.reducer';
import { CurrencyActions } from '@store/currency/currency.actions';
import { ICurrency } from '@models/currency.model';

const initialState: CurrencyState = {
  rates: {},
  currencies: [],
  currencyRowMap: {},
  baseCurrency: null,
  baseCurrencyRowNumber: null,
  loading: false,
  error: null,
};

const mockCurrency = (code: string): ICurrency => ({
  currencyCode: code,
  name: `${code} name`,
  rateToBase: 1.5,
  lastUpdated: '2026-01-01T00:00:00.000Z',
  source: 'api',
});

describe('CurrencyReducer', () => {

  // REQ-01: loadCurrenciesSuccess populates currencies + rowMap + baseCurrency
  describe('loadCurrenciesSuccess', () => {
    it('populates currencies, currencyRowMap, baseCurrency and sets loading false', () => {
      const currencies = [mockCurrency('USD'), mockCurrency('EUR')];
      const currencyRowMap = { USD: 2, EUR: 3 };

      const state = currencyReducer(
        { ...initialState, loading: true },
        CurrencyActions.loadCurrenciesSuccess({
          currencies,
          currencyRowMap,
          baseCurrency: 'USD',
          baseCurrencyRowNumber: 5,
        }),
      );

      expect(state.currencies.length).toBe(2);
      expect(state.loading).toBeFalse();
      expect(state.currencyRowMap['USD']).toBe(2);
      expect(state.currencyRowMap['EUR']).toBe(3);
      expect(state.baseCurrency).toBe('USD');
      expect(state.baseCurrencyRowNumber).toBe(5);
      expect(state.error).toBeNull();
    });

    // REQ-01 edge: empty payload
    it('handles empty currencies without error', () => {
      const state = currencyReducer(
        initialState,
        CurrencyActions.loadCurrenciesSuccess({
          currencies: [],
          currencyRowMap: {},
          baseCurrency: null,
          baseCurrencyRowNumber: null,
        }),
      );

      expect(state.currencies).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.loading).toBeFalse();
    });
  });

  // REQ-03: saveCurrencySuccess replaces existing, does not duplicate
  describe('saveCurrencySuccess', () => {
    it('replaces existing currency with same code — no duplicate', () => {
      const original = mockCurrency('USD');
      const updated: ICurrency = { ...original, rateToBase: 2.0, source: 'manual' };
      const stateWithUSD: CurrencyState = {
        ...initialState,
        currencies: [original],
        currencyRowMap: { USD: 2 },
      };

      const state = currencyReducer(
        stateWithUSD,
        CurrencyActions.saveCurrencySuccess({ currency: updated, rowNumber: 2 }),
      );

      expect(state.currencies.length).toBe(1);
      expect(state.currencies[0].rateToBase).toBe(2.0);
      expect(state.currencies[0].source).toBe('manual');
    });

    it('appends new currency if code does not exist', () => {
      const stateWithUSD: CurrencyState = {
        ...initialState,
        currencies: [mockCurrency('USD')],
        currencyRowMap: { USD: 2 },
      };
      const newEur = mockCurrency('EUR');

      const state = currencyReducer(
        stateWithUSD,
        CurrencyActions.saveCurrencySuccess({ currency: newEur, rowNumber: 3 }),
      );

      expect(state.currencies.length).toBe(2);
      expect(state.currencyRowMap['EUR']).toBe(3);
    });
  });

});
