import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { TransactionsStateService } from '../../../core/state/transactions.state';
import { TransactionService } from '../../../features/transactions/services/transaction.service';
import { ConceptsService } from '../../../features/transactions/services/concepts.service';
import { CurrencyApiService } from '../../../core/services/currency-api.service';
import { BudgetsStateService } from '../../../core/state/budgets.state';
import { MOCK_TRANSACTIONS } from '../../fixtures';
import { ITransaction } from '../../../models/transaction.model';

// ─────────────────────────────────────────────────────────────────────────────
// TransactionsStateService — REQ-02
// ─────────────────────────────────────────────────────────────────────────────
describe('TransactionsStateService', () => {
  let service: TransactionsStateService;
  let txServiceSpy: jasmine.SpyObj<TransactionService>;
  let conceptsSpy: jasmine.SpyObj<ConceptsService>;
  let currencyApiSpy: jasmine.SpyObj<CurrencyApiService>;
  let budgetsStateSpy: jasmine.SpyObj<BudgetsStateService>;

  const TWO_TXS = MOCK_TRANSACTIONS.slice(0, 2);
  const THIRD_TX: ITransaction = { ...MOCK_TRANSACTIONS[0], txId: 'new-tx-001' };

  beforeEach(() => {
    txServiceSpy = jasmine.createSpyObj('TransactionService', [
      'loadTransactions',
      'saveTransaction',
      'deleteTransaction',
      'processRecurring',
      'createTransaction',
    ]);
    conceptsSpy      = jasmine.createSpyObj('ConceptsService', ['upsertConcept']);
    currencyApiSpy   = jasmine.createSpyObj('CurrencyApiService', ['getRate']);
    budgetsStateSpy  = jasmine.createSpyObj('BudgetsStateService', ['recalculate']);

    txServiceSpy.processRecurring.and.returnValue([]);
    txServiceSpy.saveTransaction.and.returnValue(of(undefined));
    txServiceSpy.deleteTransaction.and.returnValue(of(undefined));
    conceptsSpy.upsertConcept.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        TransactionsStateService,
        { provide: TransactionService,  useValue: txServiceSpy },
        { provide: ConceptsService,     useValue: conceptsSpy },
        { provide: CurrencyApiService,  useValue: currencyApiSpy },
        { provide: BudgetsStateService, useValue: budgetsStateSpy },
      ],
    });

    service = TestBed.inject(TransactionsStateService);
  });

  // REQ-02 sc1 — load() exitoso → items() contiene las transacciones
  it('load_shouldSetItems_whenLoadSucceeds', fakeAsync(() => {
    txServiceSpy.loadTransactions.and.returnValue(
      of({ transactions: TWO_TXS, rowMap: { [TWO_TXS[0].txId]: 2, [TWO_TXS[1].txId]: 3 } }),
    );

    service.load();
    flushMicrotasks();

    expect(service.items().length).toBe(2);
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
  }));

  // REQ-02 sc2 — load() con error de red → error() no null, items() vacío
  it('load_shouldSetError_whenLoadFails', fakeAsync(() => {
    txServiceSpy.loadTransactions.and.returnValue(
      throwError(() => new Error('Network error')),
    );

    service.load();
    flushMicrotasks();

    expect(service.error()).not.toBeNull();
    expect(service.items().length).toBe(0);
    expect(service.loading()).toBeFalse();
  }));

  // REQ-02 sc3 — add() optimistic exitoso → items() pasa de 2 a 3
  it('add_shouldIncreaseItemsCount_whenSaveSucceeds', fakeAsync(() => {
    txServiceSpy.loadTransactions.and.returnValue(
      of({ transactions: TWO_TXS, rowMap: {} }),
    );
    service.load();
    flushMicrotasks();

    txServiceSpy.createTransaction.and.returnValue(Promise.resolve(THIRD_TX));
    txServiceSpy.saveTransaction.and.returnValue(of(undefined));

    service.add({ amount: 100, currency: 'EUR', categoryId: 'cat_001', walletId: 'wal_001', date: '2026-04-26', type: 'expense', concept: 'Test', notes: null, isRecurring: false, recurrenceRule: null } as any, 'EUR');
    flushMicrotasks();

    expect(service.items().length).toBe(3);
  }));

  // REQ-02 sc4 — add() rollback al fallar la persistencia → items() vuelve a 2
  it('add_shouldRollback_whenSaveFails', fakeAsync(() => {
    txServiceSpy.loadTransactions.and.returnValue(
      of({ transactions: TWO_TXS, rowMap: {} }),
    );
    service.load();
    flushMicrotasks();

    txServiceSpy.createTransaction.and.returnValue(Promise.resolve(THIRD_TX));
    txServiceSpy.saveTransaction.and.returnValue(throwError(() => new Error('Save failed')));

    service.add({ amount: 100, currency: 'EUR', categoryId: 'cat_001', walletId: 'wal_001', date: '2026-04-26', type: 'expense', concept: 'Test', notes: null, isRecurring: false, recurrenceRule: null } as any, 'EUR');
    flushMicrotasks();

    expect(service.items().length).toBe(2);
    expect(service.error()).not.toBeNull();
  }));

  // REQ-02 sc5 — delete() rollback al fallar → items() vuelve al estado previo
  it('delete_shouldRollback_whenDeleteFails', fakeAsync(() => {
    txServiceSpy.loadTransactions.and.returnValue(
      of({ transactions: TWO_TXS, rowMap: { [TWO_TXS[0].txId]: 2 } }),
    );
    service.load();
    flushMicrotasks();

    txServiceSpy.deleteTransaction.and.returnValue(throwError(() => new Error('Delete failed')));

    service.delete(TWO_TXS[0].txId, 2);
    flushMicrotasks();

    expect(service.items().length).toBe(2);
    expect(service.error()).not.toBeNull();
  }));
});
