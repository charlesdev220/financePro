import { transactionsReducer, TransactionsState } from '../../../store/transactions/transactions.reducer';
import { TransactionsActions } from '../../../store/transactions/transactions.actions';
import { ITransaction } from '../../../models/transaction.model';

const mockTx = (id: string): ITransaction => ({
  txId: id,
  userId: 'user-001',
  walletId: 'wal-001',
  categoryId: 'cat-001',
  amount: 100,
  currency: 'EUR',
  amountBase: 100,
  concept: 'Test',
  date: '2026-04-01',
  type: 'expense',
  isRecurring: false,
  recurrenceRule: null,
  notes: null,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
});

const initialState: TransactionsState = {
  items: [],
  rowMap: {},
  loading: false,
  error: null,
};

describe('transactionsReducer', () => {
  it('should return initial state', () => {
    const state = transactionsReducer(undefined, { type: '@@INIT' } as any);
    expect(state).toEqual(initialState);
  });

  it('should set loading=true on loadTransactions', () => {
    const state = transactionsReducer(initialState, TransactionsActions.loadTransactions());
    expect(state.loading).toBeTrue();
    expect(state.error).toBeNull();
  });

  it('should populate items and rowMap on loadTransactionsSuccess', () => {
    const transactions = [mockTx('tx-001'), mockTx('tx-002')];
    const rowMap = { 'tx-001': 2, 'tx-002': 3 };
    const state = transactionsReducer(
      initialState,
      TransactionsActions.loadTransactionsSuccess({ transactions, rowMap }),
    );
    expect(state.items.length).toBe(2);
    expect(state.rowMap).toEqual(rowMap);
    expect(state.loading).toBeFalse();
  });

  // REQ-15 sc1: addTransactionSuccess añade al store optimistamente
  it('should add transaction to items on addTransactionSuccess', () => {
    const tx = mockTx('tx-new');
    const state = transactionsReducer(
      initialState,
      TransactionsActions.addTransactionSuccess({ transaction: tx }),
    );
    expect(state.items.length).toBe(1);
    expect(state.items[0].txId).toBe('tx-new');
  });

  // REQ-15 sc2: addTransactionFailure revierte al estado previo
  it('should revert items on addTransactionFailure', () => {
    const prev = [mockTx('tx-001')];
    const stateWithNew: TransactionsState = {
      ...initialState,
      items: [...prev, mockTx('tx-new')],
    };
    const state = transactionsReducer(
      stateWithNew,
      TransactionsActions.addTransactionFailure({ error: 'Network error', prevItems: prev }),
    );
    expect(state.items.length).toBe(1);
    expect(state.items[0].txId).toBe('tx-001');
    expect(state.error).toBe('Network error');
  });

  it('should update transaction on updateTransactionSuccess', () => {
    const existingState: TransactionsState = {
      ...initialState,
      items: [mockTx('tx-001')],
    };
    const updated = { ...mockTx('tx-001'), concept: 'Updated concept' };
    const state = transactionsReducer(
      existingState,
      TransactionsActions.updateTransactionSuccess({ transaction: updated }),
    );
    expect(state.items[0].concept).toBe('Updated concept');
  });

  it('should remove transaction on deleteTransactionSuccess', () => {
    const existingState: TransactionsState = {
      ...initialState,
      items: [mockTx('tx-001'), mockTx('tx-002')],
    };
    const state = transactionsReducer(
      existingState,
      TransactionsActions.deleteTransactionSuccess({ txId: 'tx-001' }),
    );
    expect(state.items.length).toBe(1);
    expect(state.items[0].txId).toBe('tx-002');
  });
});
