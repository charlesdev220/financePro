import { createServiceFactory, SpectatorService, mockProvider } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { WalletsStateService } from '@core/state/wallets.state';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
import { AppendResponse } from '@features/transactions/services/transaction.service';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { IWallet } from '@models/wallet.model';

// WALLETS schema (A:J — 10 columnas):
// A: wallet_id | B: user_id | C: name | D: currency | E: balance (deprecated)
// F: color | G: icon | H: is_default | I: created_at | J: workspace_id
const MOCK_USER_ID = 'u1';

const mockWallet: IWallet = {
  walletId: 'wal_1',
  userId: MOCK_USER_ID,
  name: 'Efectivo',
  currency: 'EUR',
  balance: 0,
  color: '#5BAD8F',
  icon: '💳',
  isDefault: true,
  workspaceId: 'ws_1',
  createdAt: '2026-01-01T00:00:00Z',
};

// Fila en formato Sheets (arrays de strings)
const walletRow = [
  mockWallet.walletId,
  MOCK_USER_ID,
  mockWallet.name,
  mockWallet.currency,
  '0',
  mockWallet.color,
  mockWallet.icon,
  'true',
  mockWallet.createdAt,
  mockWallet.workspaceId,
];

// Respuesta completa de getRange con header + filas de datos
const sheetsResponse = (dataRows: unknown[][]) => ({
  range: 'Sheet!A:Z',
  majorDimension: 'ROWS',
  values: [
    ['wallet_id', 'user_id', 'name', 'currency', 'balance', 'color', 'icon', 'is_default', 'created_at', 'workspace_id'],
    ...dataRows,
  ],
});

describe('WalletsStateService', () => {
  let spectator: SpectatorService<WalletsStateService>;

  const activeWorkspaceId = signal('ws_1');
  const defaultWorkspaceId = signal('ws_default');

  const createService = createServiceFactory({
    service: WalletsStateService,
    mocks: [SheetsApiService, AuthService],
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

    spectator.inject(AuthService).getUser.mockReturnValue({ sub: MOCK_USER_ID } as any);
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(
      of({ updates: { updatedRange: 'WALLETS!A2:J2' } } as AppendResponse),
    );
    spectator.inject(SheetsApiService).updateRow.mockReturnValue(of(undefined));
    spectator.inject(SheetsApiService).deleteRow.mockReturnValue(of(undefined));
  });

  // ─── LOAD ───────────────────────────────────────────────────────────────────

  it('load_shouldSetItemsAndRowMap_whenLoadSucceeds', async () => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([walletRow])),
    );

    // When
    spectator.service.load();
    expect(spectator.service.loading()).toBe(true);
    await Promise.resolve();

    // Then
    expect(spectator.service.items()).toHaveLength(1);
    expect(spectator.service.items()[0].walletId).toBe(mockWallet.walletId);
    expect(spectator.service.rowMap()[mockWallet.walletId]).toBe(2);
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

  it('load_shouldBeIdempotent_whenAlreadyLoaded', async () => {
    // Given — primera carga
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([walletRow])),
    );
    await spectator.service.load();

    const getRangeSpy = spectator.inject(SheetsApiService).getRange;
    const callCount = getRangeSpy.mock.calls.length;

    // When — segunda llamada sin force
    await spectator.service.load();

    // Then — getRange no vuelve a llamarse
    expect(getRangeSpy.mock.calls.length).toBe(callCount);
  });

  // ─── ADD / ROLLBACK ─────────────────────────────────────────────────────────

  it('add_shouldAddOptimisticallyAndUpdateRowMap_whenAppendSucceeds', async () => {
    // Given — appendRow retorna updatedRange con número de fila
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(
      of({ updates: { updatedRange: 'WALLETS!A5:J5' } } as AppendResponse),
    );
    const newWallet: IWallet = { ...mockWallet, walletId: 'wal_new' };

    // When
    spectator.service.add(newWallet);
    expect(spectator.service.items()).toContain(newWallet);

    await Promise.resolve();

    // Then — rowMap se actualiza con el número de fila devuelto
    expect(spectator.service.rowMap()['wal_new']).toBe(5);
  });

  it('add_shouldCallLoad_whenAppendReturnsNoUpdatedRange', async () => {
    // Given — appendRow retorna respuesta sin updatedRange
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(of({} as AppendResponse));
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([walletRow])),
    );
    const newWallet: IWallet = { ...mockWallet, walletId: 'wal_new' };

    // When
    spectator.service.add(newWallet);
    await Promise.resolve();
    await Promise.resolve();

    // Then — se dispara load(true) para sincronizar el rowMap
    expect(spectator.inject(SheetsApiService).getRange).toHaveBeenCalled();
  });

  it('add_shouldRevertAdd_whenAppendFails', async () => {
    // Given
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(
      throwError(() => 'Save error'),
    );
    const newWallet: IWallet = { ...mockWallet, walletId: 'wal_new' };

    // When
    spectator.service.add(newWallet);
    await Promise.resolve();

    // Then — rollback: la wallet no queda en el estado
    expect(spectator.service.items()).not.toContain(newWallet);
    expect(spectator.service.error()).toBe('Save error');
  });

  // ─── UPDATE ─────────────────────────────────────────────────────────────────

  it('update_shouldUpdateWalletOptimistically', async () => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([walletRow])),
    );
    await spectator.service.load();

    const updated: IWallet = { ...mockWallet, name: 'Efectivo Updated' };

    // When
    spectator.service.update(updated, 2);

    // Then — optimistic: reflejo inmediato
    expect(spectator.service.items()[0].name).toBe('Efectivo Updated');
  });

  it('update_shouldRollback_whenUpdateFails', async () => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([walletRow])),
    );
    await spectator.service.load();

    spectator.inject(SheetsApiService).updateRow.mockReturnValue(
      throwError(() => 'Update error'),
    );
    const updated: IWallet = { ...mockWallet, name: 'Fail Name' };

    // When
    spectator.service.update(updated, 2);
    await Promise.resolve();

    // Then — rollback al nombre original
    expect(spectator.service.items()[0].name).toBe(mockWallet.name);
    expect(spectator.service.error()).toBe('Update error');
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────────

  it('delete_shouldDeleteOptimistically', async () => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([walletRow])),
    );
    await spectator.service.load();

    // When
    spectator.service.delete(mockWallet.walletId, 2);

    // Then — optimistic: eliminado de inmediato
    expect(spectator.service.items()).toHaveLength(0);
  });

  it('delete_shouldRollback_whenDeleteFails', async () => {
    // Given
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of(sheetsResponse([walletRow])),
    );
    await spectator.service.load();

    spectator.inject(SheetsApiService).deleteRow.mockReturnValue(
      throwError(() => 'Delete error'),
    );

    // When
    spectator.service.delete(mockWallet.walletId, 2);
    await Promise.resolve();

    // Then — rollback
    expect(spectator.service.items()).toHaveLength(1);
    expect(spectator.service.error()).toBe('Delete error');
  });
});
