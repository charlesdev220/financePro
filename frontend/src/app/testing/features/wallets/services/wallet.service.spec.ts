import { rowToWallet, walletToRow } from '@features/wallets/services/wallet.service';

describe('wallet.service pure functions', () => {
  describe('rowToWallet / walletToRow', () => {
    it('round-trips a wallet through row format', () => {
      const row = ['wal_1', 'usr_1', 'Efectivo', 'EUR', '0', '#5BAD8F', '💳', 'true', '2024-01-01T00:00:00.000Z', 'ws_1'];
      const wallet = rowToWallet(row, 'ws_default');
      expect(wallet.walletId).toBe('wal_1');
      expect(wallet.name).toBe('Efectivo');
      expect(wallet.currency).toBe('EUR');
      expect(wallet.isDefault).toBe(true);
      const backToRow = walletToRow(wallet);
      expect(backToRow[0]).toBe('wal_1');
      expect(backToRow[3]).toBe('EUR');
    });

    it('uses defaultWsId when workspaceId column is undefined', () => {
      const row = ['wal_2', 'usr_1', 'Tarjeta', 'USD', '0', '#E57373', '💳', 'false', '2024-01-01T00:00:00.000Z', undefined];
      const wallet = rowToWallet(row, 'ws_default');
      expect(wallet.workspaceId).toBe('ws_default');
    });

    it('maps isDefault false when row[7] is "false"', () => {
      const row = ['wal_3', 'usr_1', 'Ahorro', 'USD', '0', '#5BAD8F', '💰', 'false', '2024-01-01T00:00:00.000Z', 'ws_1'];
      const wallet = rowToWallet(row);
      expect(wallet.isDefault).toBe(false);
    });

    it('maps all wallet fields correctly', () => {
      const row = ['wal_4', 'usr_2', 'Cuenta', 'ARS', '0', '#E57373', '🏦', 'true', '2025-06-01T00:00:00.000Z', 'ws_2'];
      const wallet = rowToWallet(row);
      expect(wallet.walletId).toBe('wal_4');
      expect(wallet.userId).toBe('usr_2');
      expect(wallet.name).toBe('Cuenta');
      expect(wallet.currency).toBe('ARS');
      expect(wallet.color).toBe('#E57373');
      expect(wallet.icon).toBe('🏦');
      expect(wallet.createdAt).toBe('2025-06-01T00:00:00.000Z');
      expect(wallet.workspaceId).toBe('ws_2');
    });

    it('walletToRow always writes 0 for balance column', () => {
      const row = ['wal_5', 'usr_1', 'Test', 'EUR', '0', '#5BAD8F', '💳', 'true', '2024-01-01T00:00:00.000Z', 'ws_1'];
      const wallet = rowToWallet(row);
      const backToRow = walletToRow(wallet);
      expect(backToRow[4]).toBe(0); // balance deprecated
    });
  });
});
