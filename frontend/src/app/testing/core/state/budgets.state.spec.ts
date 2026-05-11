import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { createServiceFactory, SpectatorService, mockProvider } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { BudgetsStateService } from '@core/state/budgets.state';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { MOCK_BUDGETS, MOCK_TRANSACTIONS, MOCK_WORKSPACE_ID_A } from '../../fixtures';
import { IBudget } from '@models/budget.model';

// Fila de budget en formato Sheets (arrays de strings):
// A: budget_id | B: user_id | C: category_id | D: period | E: budget_amount
// F: spent_amount | G: status | H: last_updated | I: workspace_id | J: mode | K: start_date | L: end_date
const MOCK_USER_ID = 'usr_001';
const MOCK_BUDGET_ROW = [
  MOCK_BUDGETS[0].budgetId,
  MOCK_USER_ID,
  MOCK_BUDGETS[0].categoryId,
  MOCK_BUDGETS[0].period,
  String(MOCK_BUDGETS[0].budgetAmount),
  String(MOCK_BUDGETS[0].spentAmount),
  MOCK_BUDGETS[0].status,
  MOCK_BUDGETS[0].lastUpdated,
  MOCK_WORKSPACE_ID_A,
  'indefinite',
  '',
  '',
];

// Respuesta completa de getRange: primera fila es header
const sheetsResponse = (dataRows: unknown[][]) => ({
  range: 'Sheet!A:Z',
  majorDimension: 'ROWS',
  values: [
    ['budget_id', 'user_id', 'category_id', 'period', 'budget_amount', 'spent_amount', 'status', 'last_updated', 'workspace_id', 'mode', 'start_date', 'end_date'],
    ...dataRows,
  ],
});

describe('BudgetsStateService', () => {
  let spectator: SpectatorService<BudgetsStateService>;

  const activeWorkspaceId = signal(MOCK_WORKSPACE_ID_A);
  const defaultWorkspaceId = signal(MOCK_WORKSPACE_ID_A);

  const createService = createServiceFactory({
    service: BudgetsStateService,
    mocks: [SheetsApiService, AuthService],
    providers: [
      mockProvider(WorkspacesStateService, {
        activeWorkspaceId,
        defaultWorkspaceId,
      }),
    ],
  });

  const ONE_ROW = [MOCK_BUDGET_ROW];
  const ROW_MAP: Record<string, number> = { [MOCK_BUDGETS[0].budgetId]: 2 };

  const NEW_BUDGET: IBudget = {
    budgetId:     'budget-new-001',
    userId:       MOCK_USER_ID,
    categoryId:   'cat-new',
    period:       '2026-04',
    spentAmount:  0,
    budgetAmount: 300,
    status:       'ok',
    lastUpdated:  '2026-04-26T00:00:00.000Z',
    workspaceId:  MOCK_WORKSPACE_ID_A,
    mode:         'indefinite',
  };

  beforeEach(() => {
    activeWorkspaceId.set(MOCK_WORKSPACE_ID_A);
    defaultWorkspaceId.set(MOCK_WORKSPACE_ID_A);
    spectator = createService();

    spectator.inject(AuthService).getUser.mockReturnValue({ sub: MOCK_USER_ID } as any);
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(of({}));
    spectator.inject(SheetsApiService).updateRow.mockReturnValue(of(undefined));
    spectator.inject(SheetsApiService).deleteRow.mockReturnValue(of(undefined));
  });

  // ─── LOAD ───────────────────────────────────────────────────────────────────

  it('load_shouldSetItemsAndRowMap_whenLoadSucceeds', fakeAsync(() => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse(ONE_ROW)),
    );

    // When
    spectator.service.load();
    flushMicrotasks();

    // Then
    expect(spectator.service.items().length).toBe(1);
    expect(spectator.service.rowMap()[MOCK_BUDGETS[0].budgetId]).toBe(2);
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
  }));

  it('load_shouldReturnEmptyItems_whenSheetHasOnlyHeader', fakeAsync(() => {
    // Given — valores con solo header, sin filas de datos
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of({ range: 'Sheet!A:Z', majorDimension: 'ROWS', values: [['budget_id', 'user_id']] }),
    );

    // When
    spectator.service.load();
    flushMicrotasks();

    // Then
    expect(spectator.service.items()).toHaveLength(0);
    expect(spectator.service.loading()).toBe(false);
  }));

  // ─── SAVE / ROLLBACK ────────────────────────────────────────────────────────

  it('save_shouldRollback_whenSaveFails', fakeAsync(() => {
    // Given — estado inicial cargado con un budget
    spectator.inject(SheetsApiService).getRange.mockReturnValue(of(sheetsResponse(ONE_ROW)));
    spectator.service.load();
    flushMicrotasks();

    spectator.inject(SheetsApiService).appendRow.mockReturnValue(throwError(() => 'Save error'));

    // When
    spectator.service.save(NEW_BUDGET);
    flushMicrotasks();

    // Then — rollback: vuelve a 1 item
    expect(spectator.service.items().length).toBe(1);
    expect(spectator.service.error()).toBe('Save error');
  }));

  // ─── UPDATE / ROLLBACK ──────────────────────────────────────────────────────

  it('update_shouldUpdateStateAndRollbackOnError', fakeAsync(() => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(of(sheetsResponse(ONE_ROW)));
    spectator.service.load();
    flushMicrotasks();

    const updated = { ...MOCK_BUDGETS[0], budgetAmount: 999 };
    spectator.inject(SheetsApiService).updateRow.mockReturnValue(throwError(() => 'Update error'));

    // When — optimistic update inmediato
    spectator.service.update(updated, 2);
    expect(spectator.service.items()[0].budgetAmount).toBe(999);

    flushMicrotasks();

    // Then — rollback al valor original
    expect(spectator.service.items()[0].budgetAmount).toBe(MOCK_BUDGETS[0].budgetAmount);
    expect(spectator.service.error()).toBe('Update error');
  }));

  // ─── DELETE / ROLLBACK ──────────────────────────────────────────────────────

  it('delete_shouldDeleteFromStateAndRollbackOnError', fakeAsync(() => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(of(sheetsResponse(ONE_ROW)));
    spectator.service.load();
    flushMicrotasks();

    spectator.inject(SheetsApiService).deleteRow.mockReturnValue(throwError(() => 'Delete error'));

    // When — optimistic delete inmediato
    spectator.service.delete(MOCK_BUDGETS[0].budgetId, 2);
    expect(spectator.service.items()).toHaveLength(0);

    flushMicrotasks();

    // Then — rollback
    expect(spectator.service.items()).toHaveLength(1);
    expect(spectator.service.error()).toBe('Delete error');
  }));

  // ─── RECALCULATE ────────────────────────────────────────────────────────────

  it('recalculate_shouldUpdateSpentAmountAndStatus', fakeAsync(() => {
    // Given
    const budget = { ...MOCK_BUDGETS[0], spentAmount: 0, status: 'ok' as const };
    const budgetRow = [
      budget.budgetId, MOCK_USER_ID, budget.categoryId, budget.period,
      String(budget.budgetAmount), '0', budget.status, budget.lastUpdated,
      MOCK_WORKSPACE_ID_A, 'indefinite', '', '',
    ];
    spectator.inject(SheetsApiService).getRange.mockReturnValue(of(sheetsResponse([budgetRow])));
    spectator.service.load();
    flushMicrotasks();

    const expenseTx = {
      ...MOCK_TRANSACTIONS[0],
      type: 'expense' as const,
      categoryId: budget.categoryId,
      amountBase: 100,
      date: budget.period + '-01',
    };

    // When
    spectator.service.recalculate(budget.categoryId, budget.period, [expenseTx]);
    flushMicrotasks();

    // Then
    const updatedBudget = spectator.service.items().find(b => b.budgetId === budget.budgetId)!;
    expect(updatedBudget.spentAmount).toBe(100);
    expect(spectator.inject(SheetsApiService).updateRow).toHaveBeenCalled();
  }));

  // ─── CREATE OR RECALCULATE ──────────────────────────────────────────────────

  it('createOrRecalculate_shouldCreateNew_whenDoesNotExist', fakeAsync(() => {
    // Given — lista vacía
    spectator.inject(SheetsApiService).getRange.mockReturnValue(of(sheetsResponse([])));
    spectator.service.load();
    flushMicrotasks();

    // When
    spectator.service.createOrRecalculate('cat_new', '2026-04', 500, MOCK_USER_ID, []);
    flushMicrotasks();

    // Then — appendRow llamado para crear el nuevo budget
    expect(spectator.inject(SheetsApiService).appendRow).toHaveBeenCalled();
    expect(spectator.service.items()).toHaveLength(1);
    expect(spectator.service.items()[0].budgetAmount).toBe(500);
  }));

  it('createOrRecalculate_shouldUpdateExisting_whenAmountDiffers', fakeAsync(() => {
    // Given
    const budget = { ...MOCK_BUDGETS[0], spentAmount: 0 };
    const budgetRow = [
      budget.budgetId, MOCK_USER_ID, budget.categoryId, budget.period,
      String(budget.budgetAmount), '0', budget.status, budget.lastUpdated,
      MOCK_WORKSPACE_ID_A, 'indefinite', '', '',
    ];
    spectator.inject(SheetsApiService).getRange.mockReturnValue(of(sheetsResponse([budgetRow])));
    spectator.service.load();
    flushMicrotasks();

    const expenseTx = {
      ...MOCK_TRANSACTIONS[0],
      type: 'expense' as const,
      categoryId: budget.categoryId,
      amountBase: 100,
      date: budget.period + '-01',
    };

    // When
    spectator.service.createOrRecalculate(budget.categoryId, budget.period, 500, MOCK_USER_ID, [expenseTx]);
    flushMicrotasks();

    // Then — updateRow llamado para actualizar spentAmount
    expect(spectator.inject(SheetsApiService).updateRow).toHaveBeenCalled();
    expect(spectator.service.items()[0].spentAmount).toBe(100);
  }));
});
