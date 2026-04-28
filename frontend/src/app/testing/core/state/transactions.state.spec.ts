import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { TransactionsStateService } from '../../../core/state/transactions.state';
import { TransactionService } from '../../../features/transactions/services/transaction.service';
import { ConceptsService } from '../../../features/transactions/services/concepts.service';
import { CurrencyApiService } from '../../../core/services/currency-api.service';
import { BudgetsStateService } from '../../../core/state/budgets.state';
import { WorkspacesStateService } from '../../../core/state/workspaces.state';
import { MOCK_TRANSACTIONS, MOCK_WORKSPACE_ID_A, MOCK_WORKSPACE_ID_B } from '../../fixtures';
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
  let workspacesStateSpy: jasmine.SpyObj<WorkspacesStateService>;

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
    conceptsSpy        = jasmine.createSpyObj('ConceptsService', ['upsertConcept']);
    currencyApiSpy     = jasmine.createSpyObj('CurrencyApiService', ['getRate']);
    budgetsStateSpy    = jasmine.createSpyObj('BudgetsStateService', ['recalculate']);
    workspacesStateSpy = jasmine.createSpyObj('WorkspacesStateService', ['setActive', 'load'], {
      activeWorkspaceId:  jasmine.createSpy().and.returnValue(MOCK_WORKSPACE_ID_A),
      defaultWorkspaceId: jasmine.createSpy().and.returnValue(MOCK_WORKSPACE_ID_A),
    });

    txServiceSpy.processRecurring.and.returnValue([]);
    txServiceSpy.saveTransaction.and.returnValue(of(undefined));
    txServiceSpy.deleteTransaction.and.returnValue(of(undefined));
    conceptsSpy.upsertConcept.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        TransactionsStateService,
        { provide: TransactionService,    useValue: txServiceSpy },
        { provide: ConceptsService,       useValue: conceptsSpy },
        { provide: CurrencyApiService,    useValue: currencyApiSpy },
        { provide: BudgetsStateService,   useValue: budgetsStateSpy },
        { provide: WorkspacesStateService, useValue: workspacesStateSpy },
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

  // REQ-03 sc1 — 6 txs en ws_A y 4 en ws_B, activeWorkspaceId=ws_A → items() devuelve 6
  it('items_shouldFilterByActiveWorkspace_returningWsATxs', fakeAsync(() => {
    const txsWsA: ITransaction[] = Array.from({ length: 6 }, (_, i) => ({
      ...MOCK_TRANSACTIONS[0], txId: `tx_a_${i}`, workspaceId: MOCK_WORKSPACE_ID_A,
    }));
    const txsWsB: ITransaction[] = Array.from({ length: 4 }, (_, i) => ({
      ...MOCK_TRANSACTIONS[0], txId: `tx_b_${i}`, workspaceId: MOCK_WORKSPACE_ID_B,
    }));
    const allTxs = [...txsWsA, ...txsWsB];

    (workspacesStateSpy.activeWorkspaceId as jasmine.Spy).and.returnValue(MOCK_WORKSPACE_ID_A);
    txServiceSpy.loadTransactions.and.returnValue(of({ transactions: allTxs, rowMap: {} }));

    service.load();
    flushMicrotasks();

    expect(service.items().length).toBe(6);
    expect(service.items().every(t => t.workspaceId === MOCK_WORKSPACE_ID_A)).toBeTrue();
  }));

  // REQ-03 sc2 — tras setActive('ws_B') → items() devuelve 4 sin reload
  it('items_shouldReactivelyUpdateToWsB_whenActiveWorkspaceSwitches', fakeAsync(() => {
    const txsWsA: ITransaction[] = Array.from({ length: 6 }, (_, i) => ({
      ...MOCK_TRANSACTIONS[0], txId: `tx_a_${i}`, workspaceId: MOCK_WORKSPACE_ID_A,
    }));
    const txsWsB: ITransaction[] = Array.from({ length: 4 }, (_, i) => ({
      ...MOCK_TRANSACTIONS[0], txId: `tx_b_${i}`, workspaceId: MOCK_WORKSPACE_ID_B,
    }));
    const allTxs = [...txsWsA, ...txsWsB];

    const activeWsSpy = (workspacesStateSpy.activeWorkspaceId as jasmine.Spy);
    activeWsSpy.and.returnValue(MOCK_WORKSPACE_ID_A);
    txServiceSpy.loadTransactions.and.returnValue(of({ transactions: allTxs, rowMap: {} }));

    service.load();
    flushMicrotasks();
    expect(service.items().length).toBe(6);

    // Simular switch de workspace sin reload
    activeWsSpy.and.returnValue(MOCK_WORKSPACE_ID_B);
    // Forzar re-evaluación de la señal computed cambiando el spy
    // El computed se recalcula la próxima vez que se evalúe
    expect(service.items().length).toBe(4);
    expect(workspacesStateSpy.load).not.toHaveBeenCalled();
  }));
});
