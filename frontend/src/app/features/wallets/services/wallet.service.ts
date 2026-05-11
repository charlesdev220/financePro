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
