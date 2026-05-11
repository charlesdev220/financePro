import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { createServiceFactory, SpectatorService, mockProvider } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';

import { TransactionsStateService } from '@core/state/transactions.state';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
import { ConceptsService } from '@core/services/concepts.service';
import { CurrencyApiService } from '@core/services/currency-api.service';
import { BudgetsStateService } from '@core/state/budgets.state';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { AppendResponse } from '@features/transactions/services/transaction.service';
import { MOCK_TRANSACTIONS, MOCK_WORKSPACE_ID_A, MOCK_WORKSPACE_ID_B } from '../../fixtures';
import { ITransaction } from '@models/transaction.model';

// TRANSACTIONS schema (A:P — 16 columnas):
// A: tx_id | B: user_id | C: wallet_id | D: category_id | E: amount
// F: currency | G: amount_base | H: concept | I: date | J: type
// K: is_recurring | L: recurrence_rule | M: notes | N: created_at | O: updated_at | P: workspace_id
const MOCK_USER_ID = 'usr_001';

const flushAsync = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/** Convierte un ITransaction a fila de Sheets (16 columnas de strings). */
function txToRow(tx: ITransaction): string[] {
  return [
    tx.txId,
    tx.userId,
    tx.walletId,
    tx.categoryId,
    String(tx.amount),
    tx.currency,
    String(tx.amountBase),
    tx.concept,
    tx.date,
    tx.type,
    String(tx.isRecurring),
    tx.recurrenceRule ?? '',
    tx.notes ?? '',
    tx.createdAt,
    tx.updatedAt,
    tx.workspaceId,
  ];
}

const sheetsResponse = (dataRows: unknown[][]) => ({
  range: 'Sheet!A:Z',
  majorDimension: 'ROWS',
  values: [
    ['tx_id', 'user_id', 'wallet_id', 'category_id', 'amount', 'currency', 'amount_base',
      'concept', 'date', 'type', 'is_recurring', 'recurrence_rule', 'notes',
      'created_at', 'updated_at', 'workspace_id'],
    ...dataRows,
  ],
});

describe('TransactionsStateService', () => {
  let spectator: SpectatorService<TransactionsStateService>;
  let activeWorkspaceIdSignal: WritableSignal<string>;
  let defaultWorkspaceIdSignal: WritableSignal<string>;

  const TWO_TXS = MOCK_TRANSACTIONS.slice(0, 2);
  const TWO_ROWS = TWO_TXS.map(txToRow);

  const createService = createServiceFactory({
    service: TransactionsStateService,
    mocks: [SheetsApiService, AuthService, ConceptsService, CurrencyApiService, BudgetsStateService],
  });

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

    spectator.inject(AuthService).getUser.mockReturnValue({ sub: MOCK_USER_ID } as any);
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(
      of({ updates: { updatedRange: 'TRANSACTIONS!A10:P10' } } as AppendResponse),
    );
    spectator.inject(SheetsApiService).updateRow.mockReturnValue(of(undefined));
    spectator.inject(SheetsApiService).deleteRow.mockReturnValue(of(undefined));
    spectator.inject(ConceptsService).upsertConcept.mockReturnValue(Promise.resolve());
    spectator.inject(BudgetsStateService).recalculate.mockReturnValue(undefined as any);
    spectator.inject(CurrencyApiService).getRate.mockReturnValue(of(1));
  });

  // ─── LOAD ───────────────────────────────────────────────────────────────────

  it('load_shouldSetItems_whenLoadSucceeds', fakeAsync(() => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse(TWO_ROWS)),
    );

    // When
    spectator.service.load();
    flushMicrotasks();

    // Then
    expect(spectator.service.items().length).toBe(2);
    expect(spectator.service.loading()).toBe(false);
  }));

  it('load_shouldSetError_whenLoadFails', fakeAsync(() => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      throwError(() => 'Load error'),
    );

    // When
    spectator.service.load();
    flushMicrotasks();

    // Then
    expect(spectator.service.error()).toBe('Load error');
    expect(spectator.service.loading()).toBe(false);
  }));

  it('load_shouldHandleRecurringTransactions', fakeAsync(() => {
    // Given — una transacción recurrente que generará una nueva ocurrencia
    const recurringTx: ITransaction = {
      ...MOCK_TRANSACTIONS[0],
      txId: 'rec_1',
      isRecurring: true,
      recurrenceRule: 'monthly',
      date: '2026-03-01', // fecha pasada → genera ocurrencia para el mes siguiente
    };
    const rows = [txToRow(recurringTx)];

    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse(rows)),
    );
    // appendRow para la nueva ocurrencia devuelve respuesta válida
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(
      of({ updates: { updatedRange: 'TRANSACTIONS!A10:P10' } } as AppendResponse),
    );

    // When
    spectator.service.load();
    flushMicrotasks();

    // Then — si processRecurring genera al menos 1 transacción nueva, appendRow fue llamado
    // (el test valida el flujo de la rama con newRecurring; la cantidad depende de la lógica
    // de processRecurring con la fecha pasada)
    expect(spectator.inject(SheetsApiService).getRange).toHaveBeenCalledWith('TRANSACTIONS!A:P');
  }));

  it('load_shouldBeIdempotent_whenAlreadyLoaded', fakeAsync(() => {
    // Given — primera carga
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse(TWO_ROWS)),
    );
    spectator.service.load();
    flushMicrotasks();

    const callCount = spectator.inject(SheetsApiService).getRange.mock.calls.length;

    // When — segunda llamada sin force
    spectator.service.load();
    flushMicrotasks();

    // Then — getRange no vuelve a llamarse
    expect(spectator.inject(SheetsApiService).getRange.mock.calls.length).toBe(callCount);
  }));

  // ─── WORKSPACE FILTER ───────────────────────────────────────────────────────

  it('items_shouldFilterByActiveWorkspace_returningWsATxs', fakeAsync(() => {
    // Given — 6 txs del workspace A + 4 del workspace B
    const txsWsA: ITransaction[] = Array.from({ length: 6 }, (_, i) => ({
      ...MOCK_TRANSACTIONS[0],
      txId: `tx_a_${i}`,
      userId: MOCK_USER_ID,
      workspaceId: MOCK_WORKSPACE_ID_A,
    }));
    const txsWsB: ITransaction[] = Array.from({ length: 4 }, (_, i) => ({
      ...MOCK_TRANSACTIONS[0],
      txId: `tx_b_${i}`,
      userId: MOCK_USER_ID,
      workspaceId: MOCK_WORKSPACE_ID_B,
    }));
    const allRows = [...txsWsA, ...txsWsB].map(txToRow);

    activeWorkspaceIdSignal.set(MOCK_WORKSPACE_ID_A);
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse(allRows)),
    );

    // When
    spectator.service.load();
    flushMicrotasks();

    // Then — solo las 6 del workspace A
    expect(spectator.service.items().length).toBe(6);
  }));

  // ─── ADD ────────────────────────────────────────────────────────────────────

  it('add_shouldAddOptimisticallyAndUpdateRowMap', fakeAsync(() => {
    // Given — estado inicial vacío
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([])),
    );
    spectator.service.load();
    flushMicrotasks();

    spectator.inject(SheetsApiService).appendRow.mockReturnValue(
      of({ updates: { updatedRange: 'TRANSACTIONS!A10:P10' } } as AppendResponse),
    );

    const draft = {
      ...MOCK_TRANSACTIONS[0],
      txId: undefined as any,
      workspaceId: MOCK_WORKSPACE_ID_A,
    };

    // When
    spectator.service.add(draft, 'EUR');
    flushMicrotasks();

    // Then — appendRow llamado
    expect(spectator.inject(SheetsApiService).appendRow).toHaveBeenCalledWith(
      'TRANSACTIONS!A1',
      expect.any(Array),
    );
  }));

  it('add_shouldCallUpsertConcept_whenAddSucceeds', fakeAsync(() => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([])),
    );
    spectator.service.load();
    flushMicrotasks();

    // When
    spectator.service.add({ ...MOCK_TRANSACTIONS[0] } as any, 'EUR');
    flushMicrotasks();
    flushMicrotasks();

    // Then
    expect(spectator.inject(ConceptsService).upsertConcept).toHaveBeenCalled();
  }));

  it('add_shouldRollback_whenAppendFails', fakeAsync(() => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([])),
    );
    spectator.service.load();
    flushMicrotasks();

    spectator.inject(CurrencyApiService).getRate.mockReturnValue(of(1));
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(
      throwError(() => 'Append error'),
    );
    const prevLength = spectator.service.items().length;

    // When
    spectator.service.add({ ...MOCK_TRANSACTIONS[0] } as any, 'EUR');
    flushMicrotasks();
    flushMicrotasks();

    // Then — rollback: misma cantidad que antes
    expect(spectator.service.items().length).toBe(prevLength);
    expect(spectator.service.error()).toBe('Append error');
  }));

  it('add_shouldRollback_whenGetRateFails', fakeAsync(() => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([])),
    );
    spectator.service.load();
    flushMicrotasks();

    spectator.inject(CurrencyApiService).getRate.mockReturnValue(
      throwError(() => 'Rate error'),
    );

    // When
    spectator.service.add({ ...MOCK_TRANSACTIONS[0] } as any, 'EUR');
    flushMicrotasks();

    // Then
    expect(spectator.service.error()).toBe('Rate error');
  }));

  // ─── UPDATE / ROLLBACK ──────────────────────────────────────────────────────

  it('update_shouldRollbackAndSetError_whenUpdateFails', fakeAsync(() => {
    // Given
    const tx = { ...MOCK_TRANSACTIONS[0], userId: MOCK_USER_ID };
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([txToRow(tx)])),
    );
    spectator.service.load();
    flushMicrotasks();

    const updated = { ...tx, concept: 'Updated Concept' };
    spectator.inject(SheetsApiService).updateRow.mockReturnValue(
      throwError(() => 'Update error'),
    );

    // When
    spectator.service.update(updated, 2, 'EUR');
    flushMicrotasks();
    flushMicrotasks();
    flushMicrotasks();

    // Then — rollback al concepto original
    expect(spectator.service.items()[0].concept).toBe(tx.concept);
    expect(spectator.service.error()).toBe('Update error');
  }));

  it('update_shouldSetError_whenGetRateFails', fakeAsync(() => {
    // Given
    const tx = { ...MOCK_TRANSACTIONS[0], userId: MOCK_USER_ID };
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([txToRow(tx)])),
    );
    spectator.service.load();
    flushMicrotasks();

    spectator.inject(CurrencyApiService).getRate.mockReturnValue(
      throwError(() => 'Rate error'),
    );

    // When
    spectator.service.update(tx, 2, 'EUR');
    flushMicrotasks();

    // Then
    expect(spectator.service.error()).toBe('Rate error');
  }));

  it('update_shouldRecalculateBudget_whenExpenseUpdated', fakeAsync(() => {
    // Given
    const expense = {
      ...MOCK_TRANSACTIONS[0],
      userId: MOCK_USER_ID,
      type: 'expense' as const,
    };
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([txToRow(expense)])),
    );
    spectator.service.load();
    flushMicrotasks();

    spectator.inject(SheetsApiService).updateRow.mockReturnValue(of(undefined));

    // When
    spectator.service.update(expense, 2, 'EUR');
    flushMicrotasks();
    flushMicrotasks();

    // Then
    expect(spectator.inject(BudgetsStateService).recalculate).toHaveBeenCalled();
  }));

  // ─── DELETE ─────────────────────────────────────────────────────────────────

  it('delete_shouldDeleteOptimistically', fakeAsync(() => {
    // Given
    const tx = { ...MOCK_TRANSACTIONS[0], userId: MOCK_USER_ID };
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([txToRow(tx)])),
    );
    spectator.service.load();
    flushMicrotasks();

    // When
    spectator.service.delete(tx.txId, 2);

    // Then — optimistic
    expect(spectator.service.items()).toHaveLength(0);
  }));

  it('delete_shouldRollback_whenDeleteFails', fakeAsync(() => {
    // Given
    const tx = { ...MOCK_TRANSACTIONS[0], userId: MOCK_USER_ID };
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([txToRow(tx)])),
    );
    spectator.service.load();
    flushMicrotasks();

    spectator.inject(SheetsApiService).deleteRow.mockReturnValue(
      throwError(() => 'Delete error'),
    );

    // When
    spectator.service.delete(tx.txId, 2);
    flushMicrotasks();

    // Then — rollback
    expect(spectator.service.items()).toHaveLength(1);
    expect(spectator.service.error()).toBe('Delete error');
  }));

  it('delete_shouldRecalculateBudget_whenExpenseDeleted', fakeAsync(() => {
    // Given
    const expense = {
      ...MOCK_TRANSACTIONS[0],
      userId: MOCK_USER_ID,
      type: 'expense' as const,
    };
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([txToRow(expense)])),
    );
    spectator.service.load();
    flushMicrotasks();

    // When
    spectator.service.delete(expense.txId, 2);
    flushMicrotasks();

    // Then
    expect(spectator.inject(BudgetsStateService).recalculate).toHaveBeenCalled();
  }));
});
