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
  date: string,
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
    date,
    type,
    isRecurring: false,
    recurrenceRule: null,
    notes: null,
    createdAt: `${date}T00:00:00Z`,
    updatedAt: `${date}T00:00:00Z`,
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
    // Given: 3 transacciones del mismo usuario, distintas fechas
    const txs = [
      makeTx('t1', 'usr_001', '2026-04-10', 'w1', 'cat-1'),
      makeTx('t2', 'usr_001', '2026-03-15', 'w1', 'cat-2'),
      makeTx('t3', 'usr_001', '2026-02-20', 'w2', 'cat-1'),
    ];
    store.setState({ ...INITIAL_STATE, transactions: { ...INITIAL_STATE.transactions, items: txs } });

    // When: ningún filtro activo
    const result = component.transactionsEnriched();

    // Then
    expect(result.length).toBe(3);
  });

  // REQ-15 sc1: filterDateFrom + filterDateTo → solo muestra txs dentro del rango
  it('transactions_shouldFilterByDateRange_whenFilterDateFromAndToAreSet', () => {
    // Given
    const txs = [
      makeTx('t1', 'usr_001', '2026-04-10', 'w1', 'cat-1'),
      makeTx('t2', 'usr_001', '2026-03-15', 'w1', 'cat-2'),
      makeTx('t3', 'usr_001', '2026-04-25', 'w2', 'cat-2'),
    ];
    store.setState({ ...INITIAL_STATE, transactions: { ...INITIAL_STATE.transactions, items: txs } });
    component.filterDateFrom.set('2026-04-01');
    component.filterDateTo.set('2026-04-30');

    // When
    const result = component.transactionsEnriched();

    // Then: solo las 2 de abril
    expect(result.length).toBe(2);
    result.forEach(t => expect(t.date >= '2026-04-01' && t.date <= '2026-04-30').toBeTrue());
  });

  // REQ-15 sc3: combinación dateFrom + wallet → aplica ambos filtros
  it('transactions_shouldApplyAllActiveFilters_whenMultipleFiltersSet', () => {
    // Given
    const txs = [
      makeTx('t1', 'usr_001', '2026-04-10', 'wallet-a', 'cat-1'),
      makeTx('t2', 'usr_001', '2026-04-15', 'wallet-b', 'cat-1'),
      makeTx('t3', 'usr_001', '2026-03-10', 'wallet-a', 'cat-1'),
    ];
    store.setState({ ...INITIAL_STATE, transactions: { ...INITIAL_STATE.transactions, items: txs } });
    component.filterDateFrom.set('2026-04-01');
    component.filterWallet.set('wallet-a');

    // When
    const result = component.transactionsEnriched();

    // Then: solo t1 pasa ambos filtros
    expect(result.length).toBe(1);
    expect(result[0].txId).toBe('t1');
  });

  // REQ-15 sc1 (edge): filterDateFrom vacío ('') → muestra todas
  it('transactions_shouldReturnAll_whenFilterDateFromIsResetToEmpty', () => {
    // Given
    const txs = [
      makeTx('t1', 'usr_001', '2026-04-10', 'w1', 'cat-1'),
      makeTx('t2', 'usr_001', '2026-03-15', 'w1', 'cat-2'),
    ];
    store.setState({ ...INITIAL_STATE, transactions: { ...INITIAL_STATE.transactions, items: txs } });
    component.filterDateFrom.set('2026-04-01');
    component.filterDateFrom.set(''); // reset

    // When
    const result = component.transactionsEnriched();

    // Then: todas
    expect(result.length).toBe(2);
  });

  // Filtro de userId: no muestra transacciones de otros usuarios
  it('transactions_shouldExcludeTransactionsFromOtherUsers', () => {
    // Given
    const txs = [
      makeTx('t1', 'usr_001', '2026-04-10', 'w1', 'cat-1'),
      makeTx('t2', 'usr_999', '2026-04-10', 'w1', 'cat-1'), // otro usuario
    ];
    store.setState({ ...INITIAL_STATE, transactions: { ...INITIAL_STATE.transactions, items: txs } });

    // When
    const result = component.transactionsEnriched();

    // Then: solo la del usuario autenticado
    expect(result.length).toBe(1);
    expect(result[0].userId).toBe('usr_001');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TransactionListPage — openFilter & toggleFilter (REQ-15 panel mutex)
// ─────────────────────────────────────────────────────────────────────────────
describe('TransactionListPage – openFilter panel logic (REQ-15)', () => {
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
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  // openFilter es null por defecto
  it('openFilter_shouldBeNull_byDefault', () => {
    expect(component.openFilter()).toBeNull();
  });

  // toggleFilter('wallet') abre el panel wallet
  it('toggleFilter_shouldSetOpenFilter_whenCalledWithWallet', () => {
    // When
    component.toggleFilter('wallet');

    // Then
    expect(component.openFilter()).toBe('wallet');
  });

  // toggleFilter('wallet') dos veces → toggle mutex → cierra
  it('toggleFilter_shouldReturnOpenFilterToNull_whenCalledTwiceWithSameKey', () => {
    // Given
    component.toggleFilter('wallet');
    expect(component.openFilter()).toBe('wallet');

    // When
    component.toggleFilter('wallet');

    // Then
    expect(component.openFilter()).toBeNull();
  });

  // toggleFilter('category') cuando openFilter === 'wallet' → cambia al panel activo
  it('toggleFilter_shouldChangeToCategoryPanel_whenWalletPanelIsOpen', () => {
    // Given
    component.toggleFilter('wallet');
    expect(component.openFilter()).toBe('wallet');

    // When
    component.toggleFilter('category');

    // Then
    expect(component.openFilter()).toBe('category');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TransactionListPage — dateRangeInvalid & clearFilters (REQ-15)
// ─────────────────────────────────────────────────────────────────────────────
describe('TransactionListPage – dateRangeInvalid and clearFilters (REQ-15)', () => {
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
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  // dateRangeInvalid es false cuando ambos están vacíos
  it('dateRangeInvalid_shouldBeFalse_whenBothDatesAreEmpty', () => {
    // Given: estado inicial — ambas fechas vacías
    expect(component.filterDateFrom()).toBe('');
    expect(component.filterDateTo()).toBe('');

    // Then
    expect(component.dateRangeInvalid()).toBeFalse();
  });

  // dateRangeInvalid es false cuando solo uno tiene valor
  it('dateRangeInvalid_shouldBeFalse_whenOnlyOneDateIsSet', () => {
    // Given
    component.filterDateFrom.set('2026-04-01');
    // filterDateTo permanece vacío

    // Then
    expect(component.dateRangeInvalid()).toBeFalse();
  });

  // dateRangeInvalid es true cuando filterDateFrom > filterDateTo
  it('dateRangeInvalid_shouldBeTrue_whenFilterDateFromIsGreaterThanFilterDateTo', () => {
    // Given
    component.filterDateFrom.set('2026-04-30');
    component.filterDateTo.set('2026-04-01');

    // Then
    expect(component.dateRangeInvalid()).toBeTrue();
  });

  // clearFilters resetea filterDateFrom, filterDateTo y openFilter
  it('clearFilters_shouldResetAllFiltersToDefaults_whenCalled', () => {
    // Given: filtros activos
    component.filterWallet.set('wallet-a');
    component.filterCategory.set('cat-1');
    component.filterDateFrom.set('2026-04-01');
    component.filterDateTo.set('2026-04-30');
    component.toggleFilter('wallet');
    expect(component.openFilter()).toBe('wallet');

    // When
    component.clearFilters();

    // Then
    expect(component.filterWallet()).toBe('');
    expect(component.filterCategory()).toBe('');
    expect(component.filterDateFrom()).toBe('');
    expect(component.filterDateTo()).toBe('');
    expect(component.openFilter()).toBeNull();
  });
});
