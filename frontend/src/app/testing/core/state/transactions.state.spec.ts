import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { createServiceFactory, SpectatorService, mockProvider } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';

import { TransactionsStateService } from '@core/state/transactions.state';
import { TransactionService, AppendResponse } from '@features/transactions/services/transaction.service';
import { ConceptsService } from '@features/transactions/services/concepts.service';
import { CurrencyApiService } from '@core/services/currency-api.service';
import { BudgetsStateService } from '@core/state/budgets.state';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { MOCK_TRANSACTIONS, MOCK_WORKSPACE_ID_A, MOCK_WORKSPACE_ID_B } from '../../fixtures';
import { ITransaction } from '@models/transaction.model';

const flushAsync = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('TransactionsStateService', () => {
  let spectator: SpectatorService<TransactionsStateService>;
  let activeWorkspaceIdSignal: WritableSignal<string>;
  let defaultWorkspaceIdSignal: WritableSignal<string>;

  const createService = createServiceFactory({
    service: TransactionsStateService,
    mocks: [TransactionService, ConceptsService, CurrencyApiService, BudgetsStateService],
  });

  const TWO_TXS = MOCK_TRANSACTIONS.slice(0, 2);
  const THIRD_TX: ITransaction = { ...MOCK_TRANSACTIONS[0], txId: 'new-tx-001' };

  beforeEach(() => {
    activeWorkspaceIdSignal  = signal(MOCK_WORKSPACE_ID_A);
    defaultWorkspaceIdSignal = signal(MOCK_WORKSPACE_ID_A);

    spectator = createService({
      providers: [
        mockProvider(WorkspacesStateService, {
          activeWorkspaceId:  activeWorkspaceIdSignal,
          defaultWorkspaceId: defaultWorkspaceIdSignal,
          items:              jest.fn().mockReturnValue([]),
          setActive:          jest.fn(),
          load:               jest.fn(),
        }),
      ],
    });

    spectator.inject(TransactionService).saveTransaction.mockReturnValue(of({ updates: { updatedRange: 'TRANSACTIONS!A10:P10' } } as AppendResponse));
    spectator.inject(TransactionService).deleteTransaction.mockReturnValue(of(undefined));
    spectator.inject(TransactionService).processRecurring.mockReturnValue([]);
    spectator.inject(ConceptsService).upsertConcept.mockReturnValue(Promise.resolve());
    spectator.inject(BudgetsStateService).recalculate.mockReturnValue(undefined as any);
    spectator.inject(CurrencyApiService).getRate.mockReturnValue(of(1));
  });

  it('load_shouldHandleRecurringTransactions', fakeAsync(() => {
    const newRec: ITransaction = { ...MOCK_TRANSACTIONS[0], txId: 'rec_1' };
    spectator.inject(TransactionService).loadTransactions.mockReturnValue(of({ transactions: TWO_TXS, rowMap: {} }));
    spectator.inject(TransactionService).processRecurring.mockReturnValue([newRec]);
    spectator.inject(TransactionService).saveTransaction.mockReturnValue(of({ updates: { updatedRange: 'TRANSACTIONS!A10:P10' } } as AppendResponse));

    spectator.service.load();
    flushMicrotasks();

    expect(spectator.service.items().length).toBe(3);
    expect(spectator.inject(TransactionService).saveTransaction).toHaveBeenCalledWith(newRec);
  }));

  it('add_shouldHandleCreateTransactionError', fakeAsync(() => {
    spectator.inject(TransactionService).createTransaction.mockReturnValue(Promise.reject('Create error'));
    spectator.service.add({ amount: 100 } as any, 'USD');
    flushMicrotasks();
    expect(spectator.service.error()).toBe('Create error');
  }));

  it('update_shouldRollbackAndSetError_whenUpdateFails', fakeAsync(() => {
    const tx = { ...MOCK_TRANSACTIONS[0] };
    spectator.inject(TransactionService).loadTransactions.mockReturnValue(of({
      transactions: [tx],
      rowMap: { [tx.txId]: 2 }
    }));
    spectator.service.load();
    flushMicrotasks();

    const updated = { ...tx, concept: 'Updated' };
    spectator.inject(TransactionService).updateTransaction.mockReturnValue(throwError(() => 'Update error'));

    spectator.service.update(updated, 2, 'USD');

    // Procesar toda la cadena async: getRate → optimistic update → updateTransaction error → rollback
    flushMicrotasks();
    flushMicrotasks();
    flushMicrotasks();

    // Tras el rollback, el item vuelve al estado original y el error está seteado
    expect(spectator.service.items()[0].concept).toBe(tx.concept);
    expect(spectator.service.error()).toBe('Update error');
  }));

  it('update_shouldHandleRateError', fakeAsync(() => {
    spectator.inject(TransactionService).loadTransactions.mockReturnValue(of({ transactions: [TWO_TXS[0]], rowMap: { [TWO_TXS[0].txId]: 2 } }));
    spectator.service.load();
    flushMicrotasks();

    spectator.inject(CurrencyApiService).getRate.mockReturnValue(throwError(() => 'Rate error'));
    spectator.service.update(TWO_TXS[0], 2, 'USD');
    flushMicrotasks();

    expect(spectator.service.error()).toBe('Rate error');
  }));

  it('delete_shouldRecalculateBudget_whenExpense', fakeAsync(() => {
    const expense = { ...TWO_TXS[0], type: 'expense' as const };
    spectator.inject(TransactionService).loadTransactions.mockReturnValue(of({ transactions: [expense], rowMap: { [expense.txId]: 2 } }));
    spectator.service.load();
    flushMicrotasks();

    spectator.service.delete(expense.txId, 2);
    flushMicrotasks();

    expect(spectator.inject(BudgetsStateService).recalculate).toHaveBeenCalled();
  }));

  it('load_shouldSetItems_whenLoadSucceeds', fakeAsync(() => {
    spectator.inject(TransactionService).loadTransactions.mockReturnValue(
      of({ transactions: TWO_TXS, rowMap: { [TWO_TXS[0].txId]: 2, [TWO_TXS[1].txId]: 3 } }),
    );
    spectator.service.load();
    flushMicrotasks();
    expect(spectator.service.items().length).toBe(2);
  }));

  it('items_shouldFilterByActiveWorkspace_returningWsATxs', fakeAsync(() => {
    const txsWsA: ITransaction[] = Array.from({ length: 6 }, (_, i) => ({
      ...MOCK_TRANSACTIONS[0], txId: `tx_a_${i}`, workspaceId: MOCK_WORKSPACE_ID_A,
    }));
    const txsWsB: ITransaction[] = Array.from({ length: 4 }, (_, i) => ({
      ...MOCK_TRANSACTIONS[0], txId: `tx_b_${i}`, workspaceId: MOCK_WORKSPACE_ID_B,
    }));
    const allTxs = [...txsWsA, ...txsWsB];

    activeWorkspaceIdSignal.set(MOCK_WORKSPACE_ID_A);
    spectator.inject(TransactionService).loadTransactions.mockReturnValue(of({ transactions: allTxs, rowMap: {} }));

    spectator.service.load();
    flushMicrotasks();

    expect(spectator.service.items().length).toBe(6);
  }));
});
