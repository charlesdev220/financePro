import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { TransactionListPage } from '../../../../features/transactions/transaction-list/transaction-list.page';
import { AuthService } from '../../../../core/services/auth.service';
import { ITransaction } from '../../../../models/transaction.model';

// ─────────────────────────────────────────────────────────────────────────────
// Helper factories
// ─────────────────────────────────────────────────────────────────────────────
function makeTx(
  txId: string,
  userId: string,
  period: string,
  walletId: string,
  categoryId: string,
  type: 'income' | 'expense' = 'expense',
): ITransaction {
  return {
    txId,
    userId,
    walletId,
    categoryId,
    amount: 100,
    currency: 'EUR',
    amountBase: 100,
    concept: 'test',
    date: `${period}-10`,
    type,
    isRecurring: false,
    recurrenceRule: null,
    notes: null,
    createdAt: `${period}-10T00:00:00Z`,
    updatedAt: `${period}-10T00:00:00Z`,
  };
}

const INITIAL_STATE = {
  transactions: { items: [], rowMap: {}, loading: false, error: null },
  wallets:      { items: [], rowMap: {}, loading: false, error: null },
  categories:   { items: [], rowMap: {}, loading: false, error: null },
  budgets:      { items: [], rowMap: {}, loading: false, error: null },
  currency:     { rates: {}, loading: false, error: null },
};

const MOCK_USER = { sub: 'usr_001', email: 'test@test.com', name: 'Test' };

const mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
const mockModal = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

// ─────────────────────────────────────────────────────────────────────────────
// TransactionListPage — filter logic (REQ-15)
// ─────────────────────────────────────────────────────────────────────────────
describe('TransactionListPage – filter logic (REQ-15)', () => {
  let component: TransactionListPage;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionListPage],
      providers: [
        provideMockStore({ initialState: INITIAL_STATE }),
        {
          provide: ModalController,
          useValue: { create: jasmine.createSpy('create').and.returnValue(Promise.resolve(mockModal)) },
        },
        {
          provide: ToastController,
          useValue: { create: jasmine.createSpy('create').and.returnValue(Promise.resolve(mockToast)) },
        },
        {
          provide: AuthService,
          useValue: { getUser: () => MOCK_USER, isAuthenticated: () => true, signOut: () => {} },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(Store) as MockStore;
    const fixture = TestBed.createComponent(TransactionListPage);
    component = fixture.componentInstance;
    fixture.detectChanges(); // trigger ngOnInit
  });

  afterEach(() => {
    store.resetSelectors();
  });

  // REQ-15 sc2: sin filtro → devuelve todas las transacciones del usuario
  it('transactions_shouldReturnAllUserTransactions_whenNoFilterIsSet', () => {
    // Given: 3 transacciones del mismo usuario, distintos períodos
    const txs = [
      makeTx('t1', 'usr_001', '2026-04', 'w1', 'cat-1'),
      makeTx('t2', 'usr_001', '2026-03', 'w1', 'cat-2'),
      makeTx('t3', 'usr_001', '2026-02', 'w2', 'cat-1'),
    ];
    store.setState({ ...INITIAL_STATE, transactions: { ...INITIAL_STATE.transactions, items: txs } });

    // When: ningún filtro activo
    const result = component.transactionsEnriched();

    // Then
    expect(result.length).toBe(3);
  });

  // REQ-15 sc1: filterPeriod activo → solo muestra txs del período especificado
  it('transactions_shouldFilterByPeriod_whenFilterPeriodIsSet', () => {
    // Given
    const txs = [
      makeTx('t1', 'usr_001', '2026-04', 'w1', 'cat-1'),
      makeTx('t2', 'usr_001', '2026-03', 'w1', 'cat-2'),
      makeTx('t3', 'usr_001', '2026-04', 'w2', 'cat-2'),
    ];
    store.setState({ ...INITIAL_STATE, transactions: { ...INITIAL_STATE.transactions, items: txs } });
    component.filterPeriod.set('2026-04');

    // When
    const result = component.transactionsEnriched();

    // Then: solo las 2 de abril
    expect(result.length).toBe(2);
    result.forEach(t => expect(t.date.startsWith('2026-04')).toBeTrue());
  });

  // REQ-15 sc3: combinación period + wallet → aplica ambos filtros
  it('transactions_shouldApplyAllActiveFilters_whenMultipleFiltersSet', () => {
    // Given: 3 txs de abril, distintas carteras
    const txs = [
      makeTx('t1', 'usr_001', '2026-04', 'wallet-a', 'cat-1'),
      makeTx('t2', 'usr_001', '2026-04', 'wallet-b', 'cat-1'),
      makeTx('t3', 'usr_001', '2026-03', 'wallet-a', 'cat-1'),
    ];
    store.setState({ ...INITIAL_STATE, transactions: { ...INITIAL_STATE.transactions, items: txs } });
    component.filterPeriod.set('2026-04');
    component.filterWallet.set('wallet-a');

    // When
    const result = component.transactionsEnriched();

    // Then: solo t1 pasa ambos filtros
    expect(result.length).toBe(1);
    expect(result[0].txId).toBe('t1');
  });

  // REQ-15 sc1 (edge): filterPeriod vacío ('') → muestra todas
  it('transactions_shouldReturnAll_whenFilterPeriodIsResetToEmpty', () => {
    // Given
    const txs = [
      makeTx('t1', 'usr_001', '2026-04', 'w1', 'cat-1'),
      makeTx('t2', 'usr_001', '2026-03', 'w1', 'cat-2'),
    ];
    store.setState({ ...INITIAL_STATE, transactions: { ...INITIAL_STATE.transactions, items: txs } });
    component.filterPeriod.set('2026-04');
    component.filterPeriod.set(''); // reset

    // When
    const result = component.transactionsEnriched();

    // Then: todas
    expect(result.length).toBe(2);
  });

  // Filtro de userId: no muestra transacciones de otros usuarios
  it('transactions_shouldExcludeTransactionsFromOtherUsers', () => {
    // Given
    const txs = [
      makeTx('t1', 'usr_001', '2026-04', 'w1', 'cat-1'),
      makeTx('t2', 'usr_999', '2026-04', 'w1', 'cat-1'), // otro usuario
    ];
    store.setState({ ...INITIAL_STATE, transactions: { ...INITIAL_STATE.transactions, items: txs } });

    // When
    const result = component.transactionsEnriched();

    // Then: solo la del usuario autenticado
    expect(result.length).toBe(1);
    expect(result[0].userId).toBe('usr_001');
  });
});
