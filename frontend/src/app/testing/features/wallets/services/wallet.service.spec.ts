import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { WalletService } from '../../../../features/wallets/services/wallet.service';
import { SheetsApiService } from '../../../../core/services/sheets-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MOCK_WALLETS } from '../../../fixtures';

// ─────────────────────────────────────────────────────────────────────────────
// WalletService — REQ-06
// ─────────────────────────────────────────────────────────────────────────────
describe('WalletService', () => {
  let service: WalletService;
  let sheetsApiSpy: jasmine.SpyObj<SheetsApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  const MOCK_USER = { sub: 'usr_001', email: 'user@test.com', name: 'Test' };

  const SHEETS_ROWS = [
    ['wallet_id', 'user_id', 'name', 'currency', 'balance', 'color', 'icon', 'is_default', 'created_at'],
    [MOCK_WALLETS[0].walletId, 'usr_001', 'Efectivo', 'EUR', '0', '#1976D2', '💵', 'true',  '2026-04-01T00:00:00.000Z'],
    [MOCK_WALLETS[1].walletId, 'usr_001', 'BBVA',     'EUR', '0', '#D32F2F', '🏦', 'false', '2026-04-01T00:00:00.000Z'],
    ['other-wal-001',          'other-user', 'Other', 'USD', '0', '#000000', '💳', 'false', '2026-04-01T00:00:00.000Z'],
  ];

  beforeEach(() => {
    sheetsApiSpy = jasmine.createSpyObj('SheetsApiService', ['getRange', 'appendRow', 'updateRow', 'deleteRow']);
    authSpy      = jasmine.createSpyObj('AuthService', ['getUser']);

    authSpy.getUser.and.returnValue(MOCK_USER);
    sheetsApiSpy.getRange.and.returnValue(of({ range: 'WALLETS!A:I', majorDimension: 'ROWS' as const, values: SHEETS_ROWS }));
    sheetsApiSpy.deleteRow.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        WalletService,
        { provide: SheetsApiService, useValue: sheetsApiSpy },
        { provide: AuthService,      useValue: authSpy },
      ],
    });

    service = TestBed.inject(WalletService);
  });

  // REQ-06 sc1 — loadWallets() devuelve solo carteras del usuario, rowMap correcto
  it('loadWallets_shouldReturnOnlyCurrentUserWallets_withCorrectRowMap', (done) => {
    service.loadWallets().subscribe(({ wallets, rowMap }) => {
      // Solo carteras del usuario usr_001
      expect(wallets.every(w => w.userId === 'usr_001')).toBeTrue();
      expect(wallets.some(w => w.userId === 'other-user')).toBeFalse();
      // rowMap: walletId → número de fila (header=1, datos desde fila 2)
      expect(rowMap[MOCK_WALLETS[0].walletId]).toBe(2);
      expect(rowMap[MOCK_WALLETS[1].walletId]).toBe(3);
      done();
    });
  });

  // REQ-06 sc2 — deleteWallet() llama a SheetsApiService con el rowNumber correcto
  it('deleteWallet_shouldCallSheetsApiWithCorrectRowNumber', (done) => {
    const targetRow = 3;

    service.deleteWallet(targetRow).subscribe(() => {
      const [range] = sheetsApiSpy.deleteRow.calls.mostRecent().args;
      expect(range).toContain(`A${targetRow}`);
      done();
    });
  });
});
