import { createServiceFactory, SpectatorService, mockProvider } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { CategoriesStateService } from '@core/state/categories.state';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AppendResponse } from '@features/transactions/services/transaction.service';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { ICategory } from '@models/category.model';

// CATEGORIES schema (A:K — 11 columnas):
// A: category_id | B: user_id | C: name | D: icon | E: color | F: type
// G: budget_amount | H: budget_period | I: is_active | J: created_at | K: workspace_id
const MOCK_USER_ID = 'u1';

const mockCategory: ICategory = {
  categoryId: 'cat_1',
  userId: MOCK_USER_ID,
  name: 'Comida',
  icon: '🍔',
  color: '#E57373',
  type: 'expense',
  budgetAmount: 200,
  budgetPeriod: 'monthly',
  isActive: true,
  workspaceId: 'ws_1',
  createdAt: '2026-01-01T00:00:00Z',
};

// Fila en formato Sheets (arrays de strings)
const categoryRow = [
  mockCategory.categoryId,
  MOCK_USER_ID,
  mockCategory.name,
  mockCategory.icon,
  mockCategory.color,
  mockCategory.type,
  String(mockCategory.budgetAmount),
  mockCategory.budgetPeriod,
  'true',
  mockCategory.createdAt,
  mockCategory.workspaceId,
];

// Respuesta completa de getRange con header + filas de datos
const sheetsResponse = (dataRows: unknown[][]) => ({
  range: 'Sheet!A:Z',
  majorDimension: 'ROWS',
  values: [
    ['category_id', 'user_id', 'name', 'icon', 'color', 'type', 'budget_amount', 'budget_period', 'is_active', 'created_at', 'workspace_id'],
    ...dataRows,
  ],
});

// Respuesta de getRange para una sola fila (sin header — se usa en soft-delete)
const singleRowResponse = (row: unknown[]) => ({ range: 'Sheet!A:Z', majorDimension: 'ROWS', values: [row] });

describe('CategoriesStateService', () => {
  let spectator: SpectatorService<CategoriesStateService>;

  // ADR-02: Signals frescos por test
  const activeWorkspaceId = signal('ws_1');
  const defaultWorkspaceId = signal('ws_default');

  const createService = createServiceFactory({
    service: CategoriesStateService,
    mocks: [SheetsApiService],
    providers: [
      mockProvider(WorkspacesStateService, {
        activeWorkspaceId,
        defaultWorkspaceId,
      }),
    ],
  });

  beforeEach(() => {
    activeWorkspaceId.set('ws_1');
    defaultWorkspaceId.set('ws_default');
    spectator = createService();

    spectator.inject(SheetsApiService).appendRow.mockReturnValue(
      of({ updates: { updatedRange: 'CATEGORIES!A2:K2' } } as AppendResponse),
    );
    spectator.inject(SheetsApiService).updateRow.mockReturnValue(of(undefined));
    spectator.inject(SheetsApiService).deleteRow.mockReturnValue(of(undefined));
  });

  // ─── LOAD ───────────────────────────────────────────────────────────────────

  it('load_shouldSetItemsAndRowMap_whenLoadSucceeds', async () => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([categoryRow])),
    );

    // When
    spectator.service.load();
    expect(spectator.service.loading()).toBe(true);
    await Promise.resolve();

    // Then
    expect(spectator.service.items()).toHaveLength(1);
    expect(spectator.service.items()[0].categoryId).toBe(mockCategory.categoryId);
    expect(spectator.service.rowMap()[mockCategory.categoryId]).toBe(2);
    expect(spectator.service.loading()).toBe(false);
  });

  it('load_shouldSetError_whenLoadFails', async () => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      throwError(() => 'Load error'),
    );

    // When
    spectator.service.load();
    await Promise.resolve();

    // Then
    expect(spectator.service.error()).toBe('Load error');
    expect(spectator.service.loading()).toBe(false);
  });

  // ─── ADD / ROLLBACK ─────────────────────────────────────────────────────────

  it('add_shouldAddOptimisticallyAndUpdateRowMap_whenAppendSucceeds', async () => {
    // Given — appendRow retorna updatedRange con número de fila
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(
      of({ updates: { updatedRange: 'CATEGORIES!A8:K8' } } as AppendResponse),
    );
    const newCategory: ICategory = { ...mockCategory, categoryId: 'cat_new' };

    // When
    spectator.service.add(newCategory);
    expect(spectator.service.items()).toContain(newCategory);

    await Promise.resolve();

    // Then — rowMap se actualiza con el número de fila devuelto
    expect(spectator.service.rowMap()['cat_new']).toBe(8);
  });

  it('add_shouldCallLoad_whenAppendReturnsNoUpdatedRange', async () => {
    // Given — appendRow retorna respuesta sin updatedRange
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(of({} as AppendResponse));
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([categoryRow])),
    );
    const newCategory: ICategory = { ...mockCategory, categoryId: 'cat_new' };

    // When
    spectator.service.add(newCategory);
    await Promise.resolve();
    await Promise.resolve();

    // Then — load(true) disparado para sincronizar el rowMap
    expect(spectator.inject(SheetsApiService).getRange).toHaveBeenCalled();
  });

  it('add_shouldRevertAdd_whenAppendFails', async () => {
    // Given
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(
      throwError(() => 'Save error'),
    );
    const newCategory: ICategory = { ...mockCategory, categoryId: 'cat_new' };

    // When
    spectator.service.add(newCategory);
    await Promise.resolve();

    // Then — rollback
    expect(spectator.service.items()).not.toContain(newCategory);
    expect(spectator.service.error()).toBe('Save error');
  });

  // ─── UPDATE ─────────────────────────────────────────────────────────────────

  it('update_shouldUpdateCategoryOptimistically', async () => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([categoryRow])),
    );
    await spectator.service.load();

    const updated: ICategory = { ...mockCategory, name: 'Food Updated' };

    // When
    spectator.service.update(updated, 2);

    // Then — optimistic: reflejo inmediato
    expect(spectator.service.items()[0].name).toBe('Food Updated');
  });

  it('update_shouldRollback_whenUpdateFails', async () => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([categoryRow])),
    );
    await spectator.service.load();

    spectator.inject(SheetsApiService).updateRow.mockReturnValue(
      throwError(() => 'Update error'),
    );
    const updated: ICategory = { ...mockCategory, name: 'Fail Name' };

    // When
    spectator.service.update(updated, 2);
    await Promise.resolve();

    // Then — rollback al nombre original
    expect(spectator.service.items()[0].name).toBe(mockCategory.name);
    expect(spectator.service.error()).toBe('Update error');
  });

  // ─── SOFT-DELETE / ROLLBACK ─────────────────────────────────────────────────

  it('delete_shouldSoftDeleteOptimistically', async () => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([categoryRow])),
    );
    await spectator.service.load();

    // Para el soft-delete: getRange del rowRange devuelve la fila actual
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(singleRowResponse(categoryRow)),
    );

    // When
    spectator.service.delete(mockCategory.categoryId, 2);

    // Then — optimistic: eliminada de inmediato
    expect(spectator.service.items()).toHaveLength(0);
  });

  it('delete_shouldCallUpdateRow_withIsActiveFalse', async () => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([categoryRow])),
    );
    await spectator.service.load();

    // Para el soft-delete: getRange del rowRange devuelve la fila actual
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(singleRowResponse([...categoryRow])),
    );

    // When
    spectator.service.delete(mockCategory.categoryId, 2);
    await Promise.resolve();
    await Promise.resolve();

    // Then — updateRow llamado con is_active = false en la posición 8 (índice)
    expect(spectator.inject(SheetsApiService).updateRow).toHaveBeenCalled();
    const calledRow = spectator.inject(SheetsApiService).updateRow.mock.calls[0][1][0] as unknown[];
    expect(calledRow[8]).toBe(false);
  });

  it('delete_shouldRollback_whenUpdateRowFails', async () => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([categoryRow])),
    );
    await spectator.service.load();

    // Para el soft-delete: getRange del rowRange retorna la fila; updateRow rechaza
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(singleRowResponse([...categoryRow])),
    );
    spectator.inject(SheetsApiService).updateRow.mockReturnValue(
      throwError(() => 'Soft-delete error'),
    );

    // When
    spectator.service.delete(mockCategory.categoryId, 2);
    await Promise.resolve();
    await Promise.resolve();

    // Then — rollback
    expect(spectator.service.items()).toHaveLength(1);
    expect(spectator.service.error()).toBe('Soft-delete error');
  });

  // ─── WORKSPACE FILTER ───────────────────────────────────────────────────────

  it('items_shouldFilterByActiveWorkspace', async () => {
    // Given — dos categorías de distintos workspaces
    const catWs1 = { ...mockCategory, categoryId: 'c1', workspaceId: 'ws_1' };
    const catWs2 = { ...mockCategory, categoryId: 'c2', workspaceId: 'ws_2' };

    const rowWs1 = [...categoryRow.slice(0, 10), 'ws_1'];
    const rowWs2 = [
      'c2', MOCK_USER_ID, catWs2.name, catWs2.icon, catWs2.color,
      catWs2.type, '200', 'monthly', 'true', catWs2.createdAt, 'ws_2',
    ];

    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([rowWs1, rowWs2])),
    );
    await spectator.service.load();

    // When / Then
    activeWorkspaceId.set('ws_1');
    expect(spectator.service.items().map(c => c.workspaceId)).toEqual(['ws_1']);

    activeWorkspaceId.set('ws_2');
    expect(spectator.service.items().map(c => c.workspaceId)).toEqual(['ws_2']);
  });
});
