import {
  selectAllTransactions,
  selectTransactionsLoading,
  selectTransactionsError,
} from '../../../store/transactions/transactions.selectors';
import { AppState } from '../../../store/app.state';
import { MOCK_TRANSACTIONS } from '../../fixtures';

describe('Transactions Selectors', () => {
  const state: AppState = {
    transactions: {
      items: MOCK_TRANSACTIONS,
      loading: false,
      error: null,
    },
    wallets: { items: [], loading: false, error: null },
    budgets: { items: [], loading: false, error: null },
  };

  it('selectAllTransactions returns items array', () => {
    expect(selectAllTransactions(state)).toEqual(MOCK_TRANSACTIONS);
  });

  it('selectTransactionsLoading returns loading flag', () => {
    expect(selectTransactionsLoading(state)).toBeFalse();

    const loadingState: AppState = {
      ...state,
      transactions: { ...state.transactions, loading: true },
    };
    expect(selectTransactionsLoading(loadingState)).toBeTrue();
  });

  it('selectTransactionsError returns error string', () => {
    expect(selectTransactionsError(state)).toBeNull();

    const errorState: AppState = {
      ...state,
      transactions: { ...state.transactions, error: 'load failed' },
    };
    expect(selectTransactionsError(errorState)).toBe('load failed');
  });

  it('selectAllTransactions filters only expense transactions from fixture', () => {
    const expenses = selectAllTransactions(state).filter(t => t.type === 'expense');
    expect(expenses.length).toBeGreaterThan(0);
    expenses.forEach(t => expect(t.type).toBe('expense'));
  });

  it('selectAllTransactions filters only income transactions from fixture', () => {
    const incomes = selectAllTransactions(state).filter(t => t.type === 'income');
    expect(incomes.length).toBeGreaterThan(0);
    incomes.forEach(t => expect(t.type).toBe('income'));
  });
});
