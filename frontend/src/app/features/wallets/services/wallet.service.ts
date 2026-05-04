import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
import { IWallet } from '@models/wallet.model';
import { APP_COLORS } from '@core/constants/colors.constants';

// WALLETS schema (A:J — 10 columnas)
// A: wallet_id | B: user_id | C: name | D: currency | E: balance(deprecated)
// F: color | G: icon | H: is_default | I: created_at | J: workspace_id

export function rowToWallet(row: unknown[], defaultWsId = ''): IWallet {
  return {
    walletId: String(row[0] ?? ''),
    userId: String(row[1] ?? ''),
    name: String(row[2] ?? ''),
    currency: String(row[3] ?? 'EUR'),
    balance: 0, // calculado en store NgRx, no se lee de Sheets (ADR-04)
    color: String(row[5] ?? APP_COLORS.GREEN_BASE),
    icon: String(row[6] ?? '💳'),
    isDefault: row[7] === true || String(row[7] ?? 'false').toLowerCase() === 'true',
    createdAt: String(row[8] ?? new Date().toISOString()),
    workspaceId: String(row[9] ?? defaultWsId),
  };
}

export function walletToRow(wallet: IWallet): unknown[] {
  return [
    wallet.walletId,
    wallet.userId,
    wallet.name,
    wallet.currency,
    0,                    // balance deprecated — no se persiste el calculado
    wallet.color,
    wallet.icon,
    wallet.isDefault,
    wallet.createdAt,
    wallet.workspaceId,
  ];
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly sheetsApi = inject(SheetsApiService);
  private readonly authService = inject(AuthService);

  loadWallets(defaultWsId = ''): Observable<{ wallets: IWallet[]; rowMap: Record<string, number> }> {
    return this.sheetsApi.getRange('WALLETS!A:J').pipe(
      map(response => {
        if (!response?.values || response.values.length < 2) {
          return { wallets: [], rowMap: {} };
        }
        const allRows = response.values.slice(1);
        const userId = this.authService.getUser()?.sub ?? '';
        const rowMap: Record<string, number> = {};
        allRows.forEach((row, i) => {
          const id = String(row[0] ?? '');
          const uid = String(row[1] ?? '');
          if (id && uid === userId) rowMap[id] = i + 2; // +2: header (row 1) + 0-based index
        });
        const wallets = allRows
          .filter(row => row[0] && String(row[1] ?? '') === userId)
          .map(row => rowToWallet(row, defaultWsId));
        return { wallets, rowMap };
      }),
    );
  }

  saveWallet(wallet: IWallet): Observable<unknown> {
    return this.sheetsApi.appendRow('WALLETS!A1', [walletToRow(wallet)]);
  }

  updateWallet(wallet: IWallet, rowNumber: number): Observable<unknown> {
    return this.sheetsApi.updateRow(`WALLETS!A${rowNumber}:J${rowNumber}`, [walletToRow(wallet)]);
  }

  deleteWallet(rowNumber: number): Observable<unknown> {
    return this.sheetsApi.deleteRow(`WALLETS!A${rowNumber}:J${rowNumber}`);
  }
}
