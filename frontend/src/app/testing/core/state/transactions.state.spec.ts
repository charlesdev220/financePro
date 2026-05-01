import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { TransactionsStateService } from '@core/state/transactions.state';
import { TransactionService } from '@features/transactions/services/transaction.service';
import { ConceptsService } from '@features/transactions/services/concepts.service';
import { CurrencyApiService } from '@core/services/currency-api.service';
import { BudgetsStateService } from '@core/state/budgets.state';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { MOCK_TRANSACTIONS, MOCK_WORKSPACE_ID_A, MOCK_WORKSPACE_ID_B } from '../../fixtures';
import { ITransaction } from '@models/transaction.model';

// ─────────────────────────────────────────────────────────────────────────────
// TransactionsStateService — REQ-02
// ─────────────────────────────────────────────────────────────────────────────
describe('TransactionsStateService', () => {
  let service: TransactionsStateService;
  let txServiceSpy: jest.Mocked<TransactionService>;
  let conceptsSpy: jest.Mocked<ConceptsService>;
  let currencyApiSpy: jest.Mocked<CurrencyApiService>;
  let budgetsStateSpy: jest.Mocked<BudgetsStateService>;
  let workspacesStateSpy: jest.Mocked<WorkspacesStateService>;

  // Signals reales para que computed() de TransactionsStateService trackee correctamente
  let activeWorkspaceIdSignal  = signal(MOCK_WORKSPACE_ID_A);
  let defaultWorkspaceIdSignal = signal(MOCK_WORKSPACE_ID_A);

  const TWO_TXS = MOCK_TRANSACTIONS.slice(0, 2);
  const THIRD_TX: ITransaction = { ...MOCK_TRANSACTIONS[0], txId: 'new-tx-001' };

  beforeEach(() => {
    // Reiniciar signals en cada test
    activeWorkspaceIdSignal  = signal(MOCK_WORKSPACE_ID_A);
    defaultWorkspaceIdSignal = signal(MOCK_WORKSPACE_ID_A);

    txServiceSpy = {
      loadTransactions:  jest.fn(),
      saveTransaction:   jest.fn().mockReturnValue(of(undefined)),
      deleteTransaction: jest.fn().mockReturnValue(of(undefined)),
      processRecurring:  jest.fn().mockReturnValue([]),
      createTransaction: jest.fn(),
    } as unknown as jest.Mocked<TransactionService>;

    conceptsSpy = {
      upsertConcept: jest.fn().mockReturnValue(Promise.resolve()),
    } as unknown as jest.Mocked<ConceptsService>;

    currencyApiSpy = {
      getRate: jest.fn(),
    } as unknown as jest.Mocked<CurrencyApiService>;

    budgetsStateSpy = {
      recalculate: jest.fn(),
    } as unknown as jest.Mocked<BudgetsStateService>;

    workspacesStateSpy = {
      setActive:          jest.fn(),
      load:               jest.fn(),
      activeWorkspaceId:  activeWorkspaceIdSignal,
      defaultWorkspaceId: defaultWorkspaceIdSignal,
      items:              jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<WorkspacesStateService>;

    TestBed.configureTestingModule({
      providers: [
        TransactionsStateService,
        { provide: TransactionService,     useValue: txServiceSpy },
        { provide: ConceptsService,        useValue: conceptsSpy },
        { provide: CurrencyApiService,     useValue: currencyApiSpy },
        { provide: BudgetsStateService,    useValue: budgetsStateSpy },
        { provide: WorkspacesStateService, useValue: workspacesStateSpy },
      ],
    });

    service = TestBed.inject(TransactionsStateService);
  });

  // REQ-02 sc1 — load() exitoso → items() contiene las transacciones
  it('load_shouldSetItems_whenLoadSucceeds', fakeAsync(() => {
    txServiceSpy.loadTransactions.mockReturnValue(
      of({ transactions: TWO_TXS, rowMap: { [TWO_TXS[0].txId]: 2, [TWO_TXS[1].txId]: 3 } }),
    );

    service.load();
    flushMicrotasks();

    expect(service.items().length).toBe(2);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  }));

  // REQ-02 sc2 — load() con error de red → error() no null, items() vacío
  it('load_shouldSetError_whenLoadFails', fakeAsync(() => {
    txServiceSpy.loadTransactions.mockReturnValue(
      throwError(() => new Error('Network error')),
    );

    service.load();
    flushMicrotasks();

    expect(service.error()).not.toBeNull();
    expect(service.items().length).toBe(0);
    expect(service.loading()).toBe(false);
  }));

  // REQ-02 sc3 — add() optimistic exitoso → items() pasa de 2 a 3
  it('add_shouldIncreaseItemsCount_whenSaveSucceeds', fakeAsync(() => {
    // Primera carga: 2 txs. Segunda carga (interna del add): 3 txs (incluyendo la nueva)
    txServiceSpy.loadTransactions
      .mockReturnValueOnce(of({ transactions: TWO_TXS, rowMap: {} }))
      .mockReturnValueOnce(of({ transactions: [...TWO_TXS, THIRD_TX], rowMap: {} }));
    service.load();
    flushMicrotasks();

    txServiceSpy.createTransaction.mockReturnValue(Promise.resolve(THIRD_TX));
    txServiceSpy.saveTransaction.mockReturnValue(of(undefined));

    service.add({ amount: 100, currency: 'EUR', categoryId: 'cat_001', walletId: 'wal_001', date: '2026-04-26', type: 'expense', concept: 'Test', notes: null, isRecurring: false, recurrenceRule: null } as any, 'EUR');
    flushMicrotasks();

    expect(service.items().length).toBe(3);
  }));

  // REQ-02 sc4 — add() rollback al fallar la persistencia → items() vuelve a 2
  it('add_shouldRollback_whenSaveFails', fakeAsync(() => {
    txServiceSpy.loadTransactions.mockReturnValue(
      of({ transactions: TWO_TXS, rowMap: {} }),
    );
    service.load();
    flushMicrotasks();

    txServiceSpy.createTransaction.mockReturnValue(Promise.resolve(THIRD_TX));
    txServiceSpy.saveTransaction.mockReturnValue(throwError(() => new Error('Save failed')));

    service.add({ amount: 100, currency: 'EUR', categoryId: 'cat_001', walletId: 'wal_001', date: '2026-04-26', type: 'expense', concept: 'Test', notes: null, isRecurring: false, recurrenceRule: null } as any, 'EUR');
    flushMicrotasks();

    expect(service.items().length).toBe(2);
    expect(service.error()).not.toBeNull();
  }));

  // REQ-02 sc5 — delete() rollback al fallar → items() vuelve al estado previo
  it('delete_shouldRollback_whenDeleteFails', fakeAsync(() => {
    txServiceSpy.loadTransactions.mockReturnValue(
      of({ transactions: TWO_TXS, rowMap: { [TWO_TXS[0].txId]: 2 } }),
    );
    service.load();
    flushMicrotasks();

    txServiceSpy.deleteTransaction.mockReturnValue(throwError(() => new Error('Delete failed')));

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

    activeWorkspaceIdSignal.set(MOCK_WORKSPACE_ID_A);
    txServiceSpy.loadTransactions.mockReturnValue(of({ transactions: allTxs, rowMap: {} }));

    service.load();
    flushMicrotasks();

    expect(service.items().length).toBe(6);
    expect(service.items().every(t => t.workspaceId === MOCK_WORKSPACE_ID_A)).toBe(true);
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

    activeWorkspaceIdSignal.set(MOCK_WORKSPACE_ID_A);
    txServiceSpy.loadTransactions.mockReturnValue(of({ transactions: allTxs, rowMap: {} }));

    service.load();
    flushMicrotasks();
    expect(service.items().length).toBe(6);

    // Simular switch de workspace sin reload — el signal reactivo invalida el computed
    activeWorkspaceIdSignal.set(MOCK_WORKSPACE_ID_B);
    expect(service.items().length).toBe(4);
    expect(workspacesStateSpy.load).not.toHaveBeenCalled();
  }));
});
