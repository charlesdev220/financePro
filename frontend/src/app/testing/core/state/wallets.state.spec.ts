import { createServiceFactory, SpectatorService, mockProvider } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { WalletsStateService } from '@core/state/wallets.state';
import { WalletService } from '@features/wallets/services/wallet.service';
import { AppendResponse } from '@features/transactions/services/transaction.service';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { IWallet } from '@models/wallet.model';

describe('WalletsStateService', () => {
  let spectator: SpectatorService<WalletsStateService>;

  const activeWorkspaceId = signal('ws_1');
  const defaultWorkspaceId = signal('ws_default');

  const createService = createServiceFactory({
    service: WalletsStateService,
    mocks: [WalletService],
    providers: [
      mockProvider(WorkspacesStateService, {
        activeWorkspaceId,
        defaultWorkspaceId,
      }),
    ],
  });

  const mockWallet: IWallet = {
    walletId: 'wal_1',
    userId: 'u1',
    name: 'Cash',
    currency: 'USD',
    balance: 100,
    color: '#000',
    icon: '💵',
    isDefault: true,
    workspaceId: 'ws_1',
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    activeWorkspaceId.set('ws_1');
    defaultWorkspaceId.set('ws_default');
    spectator = createService();
  });

  it('should load wallets and update state', async () => {
    const wallets = [mockWallet];
    const rowMap = { [mockWallet.walletId]: 2 };
    spectator.inject(WalletService).loadWallets.mockReturnValue(of({ wallets, rowMap }));

    spectator.service.load();
    expect(spectator.service.loading()).toBe(true);

    await Promise.resolve();

    expect(spectator.service.items()).toEqual(wallets);
    expect(spectator.service.rowMap()).toEqual(rowMap);
    expect(spectator.service.loading()).toBe(false);
  });

  it('should handle error during load', async () => {
    spectator.inject(WalletService).loadWallets.mockReturnValue(throwError(() => 'Load error'));

    spectator.service.load();
    await Promise.resolve();

    expect(spectator.service.error()).toBe('Load error');
    expect(spectator.service.loading()).toBe(false);
  });

  it('should add wallet optimistically', async () => {
    const newWallet = { ...mockWallet, walletId: 'wal_new' };
    spectator.inject(WalletService).saveWallet.mockReturnValue(of(undefined));

    spectator.service.add(newWallet);
    expect(spectator.service.items()).toContain(newWallet);
  });

  it('should revert add on error', async () => {
    const newWallet = { ...mockWallet, walletId: 'wal_new' };
    spectator.inject(WalletService).saveWallet.mockReturnValue(throwError(() => 'Save error'));

    spectator.service.add(newWallet);
    await Promise.resolve();

    expect(spectator.service.items()).not.toContain(newWallet);
    expect(spectator.service.error()).toBe('Save error');
  });

  it('should update wallet optimistically', async () => {
    spectator.inject(WalletService).loadWallets.mockReturnValue(of({ wallets: [mockWallet], rowMap: { [mockWallet.walletId]: 2 } }));
    spectator.service.load();
    await Promise.resolve();

    const updated = { ...mockWallet, name: 'Cash Updated' };
    spectator.inject(WalletService).updateWallet.mockReturnValue(of(undefined));

    spectator.service.update(updated, 2);
    expect(spectator.service.items()[0].name).toBe('Cash Updated');
  });

  it('should delete wallet optimistically', async () => {
    spectator.inject(WalletService).loadWallets.mockReturnValue(of({ wallets: [mockWallet], rowMap: { [mockWallet.walletId]: 2 } }));
    spectator.service.load();
    await Promise.resolve();

    spectator.inject(WalletService).deleteWallet.mockReturnValue(of(undefined));

    spectator.service.delete(mockWallet.walletId, 2);
    expect(spectator.service.items()).toHaveLength(0);
  });
});
