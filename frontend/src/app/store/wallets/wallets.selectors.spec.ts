import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { selectBalanceForWallet } from './wallets.selectors';
import { ITransaction } from '../../models/transaction.model';

const mockTx = (
  id: string,
  walletId: string,
  amount: number,
  type: 'income' | 'expense',
): ITransaction => ({
  txId: id,
  userId: 'user-001',
  walletId,
  categoryId: 'cat-001',
  amount,
  currency: 'EUR',
  amountBase: amount,
  concept: '',
  date: '2026-04-01',
  type,
  isRecurring: false,
  recurrenceRule: null,
  notes: null,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
});

describe('selectBalanceForWallet', () => {
  let store: MockStore;

  const initialState = {
    transactions: { items: [], rowMap: {}, loading: false, error: null },
    wallets: { items: [], rowMap: {}, loading: false, error: null },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState })],
    });
    store = TestBed.inject<MockStore>(Store as any);
  });

  // REQ-13 sc1: ingresos y gastos mixtos = balance correcto
  it('should calculate balance as income minus expenses', done => {
    const transactions = [
      mockTx('tx-1', 'wal-001', 1000, 'income'),
      mockTx('tx-2', 'wal-001', 200, 'expense'),
      mockTx('tx-3', 'wal-001', 150, 'expense'),
    ];
    store.setState({ ...initialState, transactions: { ...initialState.transactions, items: transactions } });

    store.select(selectBalanceForWallet('wal-001')).subscribe(balance => {
      expect(balance).toBe(650); // 1000 - 200 - 150
      done();
    });
  });

  // REQ-13 sc2: cartera sin transacciones → balance 0
  it('should return 0 for wallet with no transactions', done => {
    store.setState({ ...initialState, transactions: { ...initialState.transactions, items: [] } });
    store.select(selectBalanceForWallet('wal-002')).subscribe(balance => {
      expect(balance).toBe(0);
      done();
    });
  });

  // REQ-13 sc3: usa `amount` (divisa nativa) no `amountBase`
  it('should use amount field (not amountBase) for balance', done => {
    const tx: ITransaction = {
      ...mockTx('tx-1', 'wal-001', 100, 'income'),
      amountBase: 92, // diferente de amount
    };
    store.setState({ ...initialState, transactions: { ...initialState.transactions, items: [tx] } });
    store.select(selectBalanceForWallet('wal-001')).subscribe(balance => {
      expect(balance).toBe(100); // usa amount, no amountBase
      done();
    });
  });
});
