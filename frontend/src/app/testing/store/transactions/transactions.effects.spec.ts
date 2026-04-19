import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import { of } from 'rxjs';
import { Action } from '@ngrx/store';
import * as transactionsEffects from '../../../store/transactions/transactions.effects';
import { TransactionsActions } from '../../../store/transactions/transactions.actions';
import { BudgetsActions } from '../../../store/budgets/budgets.actions';
import { TransactionService } from '../../../features/transactions/services/transaction.service';
import { ConceptsService } from '../../../features/transactions/services/concepts.service';
import { CurrencyApiService } from '../../../core/services/currency-api.service';
import { ITransaction } from '../../../models/transaction.model';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────
const EXPENSE_TX: ITransaction = {
  txId: 'tx-expense-001',
  userId: 'usr_001',
  walletId: 'w1',
  categoryId: 'cat-food',
  amount: 150,
  currency: 'EUR',
  amountBase: 150,
  concept: 'Supermercado',
  date: '2026-04-10',
  type: 'expense',
  isRecurring: false,
  recurrenceRule: null,
  notes: null,
  createdAt: '2026-04-10T12:00:00Z',
  updatedAt: '2026-04-10T12:00:00Z',
};

const INCOME_TX: ITransaction = {
  ...EXPENSE_TX,
  txId: 'tx-income-001',
  categoryId: 'cat-salary',
  type: 'income',
  concept: 'Nómina',
};

const EXPENSE_DRAFT = {
  userId: 'usr_001',
  walletId: 'w1',
  categoryId: 'cat-food',
  amount: 150,
  currency: 'EUR',
  concept: 'Supermercado',
  date: '2026-04-10',
  type: 'expense' as const,
  isRecurring: false,
  recurrenceRule: null,
  notes: null,
};

const INCOME_DRAFT = { ...EXPENSE_DRAFT, type: 'income' as const, categoryId: 'cat-salary' };

const INITIAL_STATE = {
  transactions: { items: [], rowMap: {}, loading: false, error: null },
  wallets:      { items: [], rowMap: {}, loading: false, error: null },
  categories:   { items: [], rowMap: {}, loading: false, error: null },
  budgets:      { items: [], rowMap: {}, loading: false, error: null },
  currency:     { rates: {}, loading: false, error: null },
};

// ─────────────────────────────────────────────────────────────────────────────
// TransactionsEffects — REQ-09: recalculateBudget dispatch
// ─────────────────────────────────────────────────────────────────────────────
describe('TransactionsEffects (REQ-09)', () => {
  let actions$: Subject<Action>;
  let store: MockStore;
  let transactionServiceSpy: jasmine.SpyObj<TransactionService>;
  let conceptsServiceSpy: jasmine.SpyObj<ConceptsService>;
  let currencyApiSpy: jasmine.SpyObj<CurrencyApiService>;

  beforeEach(() => {
    actions$ = new Subject<Action>();

    transactionServiceSpy = jasmine.createSpyObj('TransactionService', [
      'loadTransactions',
      'processRecurring',
      'createTransaction',
      'saveTransaction',
      'updateTransaction',
      'deleteTransaction',
    ]);
    transactionServiceSpy.loadTransactions.and.returnValue(of({ transactions: [], rowMap: {} }));
    transactionServiceSpy.processRecurring.and.returnValue([]);

    conceptsServiceSpy = jasmine.createSpyObj('ConceptsService', [
      'loadConcepts', 'getSuggestions', 'upsertConcept',
    ]);
    conceptsServiceSpy.loadConcepts.and.returnValue(of([]));
    conceptsServiceSpy.upsertConcept.and.returnValue(Promise.resolve());

    currencyApiSpy = jasmine.createSpyObj('CurrencyApiService', ['getRate']);
    currencyApiSpy.getRate.and.returnValue(of(1));

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$.asObservable()),
        provideMockStore({ initialState: INITIAL_STATE }),
        { provide: TransactionService, useValue: transactionServiceSpy },
        { provide: ConceptsService, useValue: conceptsServiceSpy },
        { provide: CurrencyApiService, useValue: currencyApiSpy },
      ],
    });

    store = TestBed.inject<MockStore>(Store as any);
  });

  afterEach(() => {
    actions$.complete();
    store.resetSelectors();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // addTransaction$
  // ─────────────────────────────────────────────────────────────────────────

  // REQ-09 sc1: nueva tx de tipo expense → dispatch recalculateBudget
  it('addTransaction_shouldDispatchRecalculateBudget_whenTransactionIsExpense', fakeAsync(() => {
    transactionServiceSpy.createTransaction.and.returnValue(Promise.resolve(EXPENSE_TX));
    transactionServiceSpy.saveTransaction.and.returnValue(of(null));
    const dispatchSpy = spyOn(store, 'dispatch').and.callThrough();

    TestBed.runInInjectionContext(() => {
      (transactionsEffects.addTransaction$ as any)().subscribe();
    });

    actions$.next(TransactionsActions.addTransaction({ draft: EXPENSE_DRAFT, userBaseCurrency: 'EUR' }));
    tick();

    expect(dispatchSpy).toHaveBeenCalledWith(
      BudgetsActions.recalculateBudget({ categoryId: 'cat-food', period: '2026-04' }),
    );
  }));

  // REQ-09 sc2: nueva tx de tipo income → NO dispatch recalculateBudget
  it('addTransaction_shouldNotDispatchRecalculateBudget_whenTransactionIsIncome', fakeAsync(() => {
    transactionServiceSpy.createTransaction.and.returnValue(Promise.resolve(INCOME_TX));
    transactionServiceSpy.saveTransaction.and.returnValue(of(null));
    const dispatchSpy = spyOn(store, 'dispatch').and.callThrough();

    TestBed.runInInjectionContext(() => {
      (transactionsEffects.addTransaction$ as any)().subscribe();
    });

    actions$.next(TransactionsActions.addTransaction({ draft: INCOME_DRAFT, userBaseCurrency: 'EUR' }));
    tick();

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      jasmine.objectContaining({ type: BudgetsActions.recalculateBudget.type }),
    );
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // deleteTransaction$
  // ─────────────────────────────────────────────────────────────────────────

  // REQ-09 sc4: delete expense → dispatch recalculateBudget con datos del tx eliminado
  it('deleteTransaction_shouldDispatchRecalculateBudget_whenDeletedTransactionIsExpense', fakeAsync(() => {
    store.setState({
      ...INITIAL_STATE,
      transactions: { items: [EXPENSE_TX], rowMap: { [EXPENSE_TX.txId]: 2 }, loading: false, error: null },
    });
    transactionServiceSpy.deleteTransaction.and.returnValue(of(null));
    const dispatchSpy = spyOn(store, 'dispatch').and.callThrough();

    TestBed.runInInjectionContext(() => {
      (transactionsEffects.deleteTransaction$ as any)().subscribe();
    });

    actions$.next(TransactionsActions.deleteTransaction({ txId: EXPENSE_TX.txId, rowNumber: 2 }));
    tick();

    expect(dispatchSpy).toHaveBeenCalledWith(
      BudgetsActions.recalculateBudget({ categoryId: EXPENSE_TX.categoryId, period: '2026-04' }),
    );
  }));

  // REQ-09 sc2 (delete): delete income → NO dispatch recalculateBudget
  it('deleteTransaction_shouldNotDispatchRecalculateBudget_whenDeletedTransactionIsIncome', fakeAsync(() => {
    store.setState({
      ...INITIAL_STATE,
      transactions: { items: [INCOME_TX], rowMap: { [INCOME_TX.txId]: 2 }, loading: false, error: null },
    });
    transactionServiceSpy.deleteTransaction.and.returnValue(of(null));
    const dispatchSpy = spyOn(store, 'dispatch').and.callThrough();

    TestBed.runInInjectionContext(() => {
      (transactionsEffects.deleteTransaction$ as any)().subscribe();
    });

    actions$.next(TransactionsActions.deleteTransaction({ txId: INCOME_TX.txId, rowNumber: 2 }));
    tick();

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      jasmine.objectContaining({ type: BudgetsActions.recalculateBudget.type }),
    );
  }));
});
