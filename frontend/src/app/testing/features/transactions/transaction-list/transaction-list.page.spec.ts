import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { TransactionListPage } from '../../../../features/transactions/transaction-list/transaction-list.page';
import { TransactionsStateService } from '../../../../core/state/transactions.state';
import { WalletsStateService } from '../../../../core/state/wallets.state';
import { CategoriesStateService } from '../../../../core/state/categories.state';
import { CurrencyStateService } from '../../../../core/state/currency.state';
import { AuthService } from '../../../../core/services/auth.service';
import { ITransaction } from '../../../../models/transaction.model';
import { IWallet } from '../../../../models/wallet.model';
import { ICategory } from '../../../../models/category.model';
import { ICurrency } from '../../../../models/currency.model';

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
    workspaceId: 'ws_test',
    createdAt:   `${date}T00:00:00Z`,
    updatedAt:   `${date}T00:00:00Z`,
  };
}

const MOCK_USER = { sub: 'usr_001', email: 'test@test.com', name: 'Test' };

const mockToast = { present: jest.fn().mockResolvedValue(undefined) };
const mockModal = { present: jest.fn().mockResolvedValue(undefined) };

function buildTxStateMock() {
  const _items   = signal<ITransaction[]>([]);
  const _error   = signal<string | null>(null);
  const _rowMap  = signal<Record<string, number>>({});
  const _loading = signal(false);
  return {
    items:   _items.asReadonly(),
    error:   _error.asReadonly(),
    rowMap:  _rowMap.asReadonly(),
    loading: _loading.asReadonly(),
    load:    jest.fn(),
    add:     jest.fn(),
    update:  jest.fn(),
    delete:  jest.fn(),
    _items,
  };
}

function buildWalletsStateMock() {
  const _items = signal<IWallet[]>([]);
  return {
    items:   _items.asReadonly(),
    loading: signal(false).asReadonly(),
    error:   signal<string|null>(null).asReadonly(),
    rowMap:  signal<Record<string,number>>({}).asReadonly(),
    load:    jest.fn(),
    add:     jest.fn(),
    update:  jest.fn(),
    delete:  jest.fn(),
  };
}

function buildCategoriesStateMock() {
  const _items = signal<ICategory[]>([]);
  return {
    items:   _items.asReadonly(),
    loading: signal(false).asReadonly(),
    error:   signal<string|null>(null).asReadonly(),
    rowMap:  signal<Record<string,number>>({}).asReadonly(),
    load:    jest.fn(),
    add:     jest.fn(),
    update:  jest.fn(),
    delete:  jest.fn(),
  };
}

function buildCurrencyStateMock() {
  return {
    items:                 signal<ICurrency[]>([]).asReadonly(),
    loading:               signal(false).asReadonly(),
    error:                 signal<string|null>(null).asReadonly(),
    rowMap:                signal<Record<string,number>>({}).asReadonly(),
    baseCurrency:          signal<string|null>('EUR').asReadonly(),
    baseCurrencyRowNumber: signal<number|null>(null).asReadonly(),
    load:                  jest.fn(),
    fetchAndPersistRate:   jest.fn(),
    saveCurrency:          jest.fn(),
    setBaseCurrency:       jest.fn(),
  };
}

function buildProviders(txStateMock: ReturnType<typeof buildTxStateMock>) {
  return [
    { provide: TransactionsStateService,  useValue: txStateMock },
    { provide: WalletsStateService,        useValue: buildWalletsStateMock() },
    { provide: CategoriesStateService,     useValue: buildCategoriesStateMock() },
    { provide: CurrencyStateService,       useValue: buildCurrencyStateMock() },
    {
      provide: ModalController,
      useValue: { create: jest.fn().mockResolvedValue(mockModal) },
    },
    {
      provide: ToastController,
      useValue: { create: jest.fn().mockResolvedValue(mockToast) },
    },
    {
      provide: AuthService,
      useValue: { getUser: () => MOCK_USER, isAuthenticated: () => true, signOut: () => {} },
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// TransactionListPage — filter logic (REQ-17, REQ-19)
// ─────────────────────────────────────────────────────────────────────────────
describe('TransactionListPage – filter logic (REQ-17, REQ-19)', () => {
  let component: TransactionListPage;
  let txStateMock: ReturnType<typeof buildTxStateMock>;

  beforeEach(async () => {
    txStateMock = buildTxStateMock();

    await TestBed.configureTestingModule({
      imports: [TransactionListPage],
      providers: buildProviders(txStateMock),
    }).compileComponents();

    const fixture = TestBed.createComponent(TransactionListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('transactions_shouldReturnAllUserTransactions_whenNoFilterIsSet', () => {
    const txs = [
      makeTx('t1', 'usr_001', '2026-04-10', 'w1', 'cat-1'),
      makeTx('t2', 'usr_001', '2026-03-15', 'w1', 'cat-2'),
      makeTx('t3', 'usr_001', '2026-02-20', 'w2', 'cat-1'),
    ];
    txStateMock._items.set(txs);

    const result = component.transactionsEnriched();

    expect(result.length).toBe(3);
  });

  it('transactions_shouldFilterByDateRange_whenFilterDateFromAndToAreSet', () => {
    const txs = [
      makeTx('t1', 'usr_001', '2026-04-10', 'w1', 'cat-1'),
      makeTx('t2', 'usr_001', '2026-03-15', 'w1', 'cat-2'),
      makeTx('t3', 'usr_001', '2026-04-25', 'w2', 'cat-2'),
    ];
    txStateMock._items.set(txs);
    component.filterDateFrom.set('2026-04-01');
    component.filterDateTo.set('2026-04-30');

    const result = component.transactionsEnriched();

    expect(result.length).toBe(2);
    result.forEach(t => expect(t.date >= '2026-04-01' && t.date <= '2026-04-30').toBe(true));
  });

  it('transactions_shouldApplyAllActiveFilters_whenMultipleFiltersSet', () => {
    const txs = [
      makeTx('t1', 'usr_001', '2026-04-10', 'wallet-a', 'cat-1'),
      makeTx('t2', 'usr_001', '2026-04-15', 'wallet-b', 'cat-1'),
      makeTx('t3', 'usr_001', '2026-03-10', 'wallet-a', 'cat-1'),
    ];
    txStateMock._items.set(txs);
    component.filterDateFrom.set('2026-04-01');
    component.filterWallet.set('wallet-a');

    const result = component.transactionsEnriched();

    expect(result.length).toBe(1);
    expect(result[0].txId).toBe('t1');
  });

  it('transactions_shouldReturnAll_whenFilterDateFromIsResetToEmpty', () => {
    const txs = [
      makeTx('t1', 'usr_001', '2026-04-10', 'w1', 'cat-1'),
      makeTx('t2', 'usr_001', '2026-03-15', 'w1', 'cat-2'),
    ];
    txStateMock._items.set(txs);
    component.filterDateFrom.set('2026-04-01');
    component.filterDateFrom.set('');

    const result = component.transactionsEnriched();

    expect(result.length).toBe(2);
  });

  it('transactions_shouldExcludeTransactionsFromOtherUsers', () => {
    const txs = [
      makeTx('t1', 'usr_001', '2026-04-10', 'w1', 'cat-1'),
      makeTx('t2', 'usr_999', '2026-04-10', 'w1', 'cat-1'),
    ];
    txStateMock._items.set(txs);

    const result = component.transactionsEnriched();

    expect(result.length).toBe(1);
    expect(result[0].userId).toBe('usr_001');
  });

  it('ngOnInit_shouldCallLoadOnAllStateServices', () => {
    expect(txStateMock.load).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TransactionListPage — openFilter & toggleFilter (REQ-17 panel mutex)
// ─────────────────────────────────────────────────────────────────────────────
describe('TransactionListPage – openFilter panel logic (REQ-17)', () => {
  let component: TransactionListPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionListPage],
      providers: buildProviders(buildTxStateMock()),
    }).compileComponents();

    const fixture = TestBed.createComponent(TransactionListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('openFilter_shouldBeNull_byDefault', () => {
    expect(component.openFilter()).toBeNull();
  });

  it('toggleFilter_shouldSetOpenFilter_whenCalledWithWallet', () => {
    component.toggleFilter('wallet');
    expect(component.openFilter()).toBe('wallet');
  });

  it('toggleFilter_shouldReturnOpenFilterToNull_whenCalledTwiceWithSameKey', () => {
    component.toggleFilter('wallet');
    expect(component.openFilter()).toBe('wallet');

    component.toggleFilter('wallet');

    expect(component.openFilter()).toBeNull();
  });

  it('toggleFilter_shouldChangeToCategoryPanel_whenWalletPanelIsOpen', () => {
    component.toggleFilter('wallet');
    expect(component.openFilter()).toBe('wallet');

    component.toggleFilter('category');

    expect(component.openFilter()).toBe('category');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TransactionListPage — dateRangeInvalid & clearFilters (REQ-17)
// ─────────────────────────────────────────────────────────────────────────────
describe('TransactionListPage – dateRangeInvalid and clearFilters (REQ-17)', () => {
  let component: TransactionListPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionListPage],
      providers: buildProviders(buildTxStateMock()),
    }).compileComponents();

    const fixture = TestBed.createComponent(TransactionListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('dateRangeInvalid_shouldBeFalse_whenBothDatesAreEmpty', () => {
    expect(component.filterDateFrom()).toBe('');
    expect(component.filterDateTo()).toBe('');

    expect(component.dateRangeInvalid()).toBe(false);
  });

  it('dateRangeInvalid_shouldBeFalse_whenOnlyOneDateIsSet', () => {
    component.filterDateFrom.set('2026-04-01');

    expect(component.dateRangeInvalid()).toBe(false);
  });

  it('dateRangeInvalid_shouldBeTrue_whenFilterDateFromIsGreaterThanFilterDateTo', () => {
    component.filterDateFrom.set('2026-04-30');
    component.filterDateTo.set('2026-04-01');

    expect(component.dateRangeInvalid()).toBe(true);
  });

  it('clearFilters_shouldResetAllFiltersToDefaults_whenCalled', () => {
    component.filterWallet.set('wallet-a');
    component.filterCategory.set('cat-1');
    component.filterDateFrom.set('2026-04-01');
    component.filterDateTo.set('2026-04-30');
    component.toggleFilter('wallet');
    expect(component.openFilter()).toBe('wallet');

    component.clearFilters();

    expect(component.filterWallet()).toBe('');
    expect(component.filterCategory()).toBe('');
    expect(component.filterDateFrom()).toBe('');
    expect(component.filterDateTo()).toBe('');
    expect(component.openFilter()).toBeNull();
  });
});
