import { transactionsReducer, TransactionsState } from '../../../store/transactions/transactions.reducer';
import { TransactionsActions } from '../../../store/transactions/transactions.actions';
import { MOCK_TRANSACTIONS } from '../../fixtures';

describe('transactionsReducer', () => {
  const initialState: TransactionsState = {
    items: [],
    loading: false,
    error: null,
  };

  it('returns the initial state for an unknown action', () => {
    const state = transactionsReducer(undefined, { type: '@@INIT' } as any);
    expect(state).toEqual(initialState);
  });

  describe('loadTransactions', () => {
    it('sets loading to true and clears previous error', () => {
      const prev: TransactionsState = { items: [], loading: false, error: 'previous error' };
      const state = transactionsReducer(prev, TransactionsActions.loadTransactions());
      expect(state.loading).toBeTrue();
      expect(state.error).toBeNull();
    });
  });

  describe('loadTransactionsSuccess', () => {
    it('stores items and sets loading to false', () => {
      const prev: TransactionsState = { items: [], loading: true, error: null };
      const state = transactionsReducer(
        prev,
        TransactionsActions.loadTransactionsSuccess({ transactions: MOCK_TRANSACTIONS })
      );
      expect(state.items).toEqual(MOCK_TRANSACTIONS);
      expect(state.loading).toBeFalse();
      expect(state.error).toBeNull();
    });

    it('replaces items on subsequent loads', () => {
      const firstLoad = transactionsReducer(
        initialState,
        TransactionsActions.loadTransactionsSuccess({ transactions: [MOCK_TRANSACTIONS[0]] })
      );
      const secondLoad = transactionsReducer(
        firstLoad,
        TransactionsActions.loadTransactionsSuccess({ transactions: MOCK_TRANSACTIONS })
      );
      expect(secondLoad.items.length).toBe(MOCK_TRANSACTIONS.length);
    });
  });

  describe('loadTransactionsFailure', () => {
    it('sets error message and sets loading to false', () => {
      const prev: TransactionsState = { items: [], loading: true, error: null };
      const state = transactionsReducer(
        prev,
        TransactionsActions.loadTransactionsFailure({ error: 'Sheets API quota exceeded' })
      );
      expect(state.error).toBe('Sheets API quota exceeded');
      expect(state.loading).toBeFalse();
    });

    it('preserves existing items on failure', () => {
      const prev: TransactionsState = { items: MOCK_TRANSACTIONS, loading: true, error: null };
      const state = transactionsReducer(
        prev,
        TransactionsActions.loadTransactionsFailure({ error: 'Network error' })
      );
      expect(state.items).toEqual(MOCK_TRANSACTIONS);
    });
  });
});
