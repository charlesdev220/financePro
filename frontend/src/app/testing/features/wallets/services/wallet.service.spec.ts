import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of, firstValueFrom } from 'rxjs';

import { WalletService } from '@features/wallets/services/wallet.service';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
import { MOCK_WALLETS } from '../../../fixtures';

// ─────────────────────────────────────────────────────────────────────────────
// WalletService — REQ-06
// ─────────────────────────────────────────────────────────────────────────────
describe('WalletService', () => {
  let spectator: SpectatorService<WalletService>;
  const createService = createServiceFactory({
    service: WalletService,
    mocks: [SheetsApiService, AuthService],
  });

  const MOCK_USER = { sub: 'usr_001', email: 'user@test.com', name: 'Test' };

  const SHEETS_ROWS = [
    ['wallet_id', 'user_id', 'name', 'currency', 'balance', 'color', 'icon', 'is_default', 'created_at'],
    [MOCK_WALLETS[0].walletId, 'usr_001', 'Efectivo', 'EUR', '0', '#1976D2', '💵', 'true', '2026-04-01T00:00:00.000Z'],
    [MOCK_WALLETS[1].walletId, 'usr_001', 'BBVA', 'EUR', '0', '#D32F2F', '🏦', 'false', '2026-04-01T00:00:00.000Z'],
    ['other-wal-001', 'other-user', 'Other', 'USD', '0', '#000000', '💳', 'false', '2026-04-01T00:00:00.000Z'],
  ];

  beforeEach(() => {
    spectator = createService();
    spectator.inject(AuthService).getUser.mockReturnValue(MOCK_USER);
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of({ range: 'WALLETS!A:I', majorDimension: 'ROWS' as const, values: SHEETS_ROWS }),
    );
    spectator.inject(SheetsApiService).deleteRow.mockReturnValue(of(undefined));
  });

  // REQ-06 sc1 — loadWallets() devuelve solo carteras del usuario, rowMap correcto
  it('loadWallets_shouldReturnOnlyCurrentUserWallets_withCorrectRowMap', async () => {
    const { wallets, rowMap } = await firstValueFrom(spectator.service.loadWallets());

    expect(wallets.every(w => w.userId === 'usr_001')).toBe(true);
    expect(wallets.some(w => w.userId === 'other-user')).toBe(false);
    expect(rowMap[MOCK_WALLETS[0].walletId]).toBe(2);
    expect(rowMap[MOCK_WALLETS[1].walletId]).toBe(3);
  });

  // REQ-06 sc2 — deleteWallet() llama a SheetsApiService con el rowNumber correcto
  it('deleteWallet_shouldCallSheetsApiWithCorrectRowNumber', async () => {
    const targetRow = 3;

    await firstValueFrom(spectator.service.deleteWallet(targetRow));

    const lastCall = spectator.inject(SheetsApiService).deleteRow.mock.calls[spectator.inject(SheetsApiService).deleteRow.mock.calls.length - 1];
    const [range] = lastCall;
    expect(range).toContain(`A${targetRow}`);
  });
});
