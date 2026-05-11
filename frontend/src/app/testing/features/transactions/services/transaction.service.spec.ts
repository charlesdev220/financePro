import { rowToTransaction, transactionToRow, processRecurring } from '@features/transactions/services/transaction.service';
import { ITransaction } from '@models/transaction.model';

// toISOString() da UTC — en timezones adelantados puede devolver el día anterior.
// processRecurring parsea fechas como hora local, así que usamos fecha local.
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const mockTx = (overrides: Partial<ITransaction> = {}): ITransaction => ({
  txId: 'tx-001',
  userId: 'user-001',
  walletId: 'wal-001',
  categoryId: 'cat-001',
  amount: 100,
  currency: 'EUR',
  amountBase: 100,
  concept: 'Test',
  date: '2026-03-01',
  type: 'expense',
  isRecurring: false,
  recurrenceRule: null,
  notes: null,
  workspaceId: 'ws_test',
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
  ...overrides,
});

describe('transaction.service pure functions', () => {
  describe('rowToTransaction / transactionToRow', () => {
    it('round-trips a transaction through row format', () => {
      const now = '2024-01-15T10:00:00.000Z';
      const row = ['tx_1', 'usr_1', 'wal_1', 'cat_1', '50', 'EUR', '50', 'Café', '2024-01-15', 'expense', 'false', '', '', now, now, 'ws_1'];
      const tx = rowToTransaction(row, 'ws_default');
      expect(tx.txId).toBe('tx_1');
      expect(tx.amount).toBe(50);
      expect(tx.type).toBe('expense');
      expect(tx.isRecurring).toBe(false);
      const backToRow = transactionToRow(tx);
      expect(backToRow[0]).toBe('tx_1');
      expect(backToRow[4]).toBe(50);
      expect(backToRow[10]).toBe(false);
    });

    it('maps null/empty optional fields to empty string in transactionToRow', () => {
      const row = ['tx_2', 'usr_1', 'wal_1', 'cat_1', '100', 'EUR', '100', 'Salario', '2024-01-15', 'income', 'false', '', '', '2024-01-15T00:00:00.000Z', '2024-01-15T00:00:00.000Z', 'ws_1'];
      const tx = rowToTransaction(row);
      const backToRow = transactionToRow(tx);
      expect(backToRow[11]).toBe(''); // recurrenceRule null → ''
      expect(backToRow[12]).toBe(''); // notes null → ''
    });

    it('should round-trip a transaction with all fields', () => {
      const tx = mockTx();
      const row = transactionToRow(tx);
      const restored = rowToTransaction(row);

      expect(restored.txId).toBe(tx.txId);
      expect(restored.amount).toBe(tx.amount);
      expect(restored.amountBase).toBe(tx.amountBase);
      expect(restored.type).toBe(tx.type);
      expect(restored.isRecurring).toBe(tx.isRecurring);
      expect(restored.recurrenceRule).toBeNull();
    });

    it('uses defaultWsId when workspaceId column is undefined', () => {
      const row = ['tx_3', 'usr_1', 'wal_1', 'cat_1', '25', 'USD', '23', 'Taxi', '2024-02-01', 'expense', 'false', '', '', '2024-02-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z', undefined];
      const tx = rowToTransaction(row, 'ws_default');
      expect(tx.workspaceId).toBe('ws_default');
    });

    it('maps isRecurring true when row[10] is "true"', () => {
      const row = ['tx_4', 'usr_1', 'wal_1', 'cat_1', '100', 'EUR', '100', 'Alquiler', '2024-01-01', 'expense', 'true', 'monthly', '', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'ws_1'];
      const tx = rowToTransaction(row);
      expect(tx.isRecurring).toBe(true);
      expect(tx.recurrenceRule).toBe('monthly');
    });

    it('maps all transaction fields correctly', () => {
      const row = ['tx_5', 'usr_2', 'wal_2', 'cat_2', '200', 'USD', '185', 'Supermercado', '2025-03-15', 'expense', 'false', '', 'nota test', '2025-03-15T08:00:00.000Z', '2025-03-15T08:00:00.000Z', 'ws_3'];
      const tx = rowToTransaction(row);
      expect(tx.userId).toBe('usr_2');
      expect(tx.walletId).toBe('wal_2');
      expect(tx.categoryId).toBe('cat_2');
      expect(tx.currency).toBe('USD');
      expect(tx.amountBase).toBe(185);
      expect(tx.concept).toBe('Supermercado');
      expect(tx.date).toBe('2025-03-15');
      expect(tx.notes).toBe('nota test');
    });
  });

  describe('processRecurring', () => {
    it('returns empty array when no recurring transactions exist', () => {
      const txs = [mockTx({ isRecurring: false })];
      expect(processRecurring(txs)).toHaveLength(0);
    });

    it('returns empty array when recurring transaction has no recurrenceRule', () => {
      const txs = [mockTx({ isRecurring: true, recurrenceRule: null })];
      expect(processRecurring(txs)).toHaveLength(0);
    });

    // REQ-07 sc1: recurrente mensual vencida → genera nueva transacción
    it('generates new transaction for overdue monthly recurring', () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = localDateStr(lastMonth);

      const recurring = mockTx({ isRecurring: true, recurrenceRule: 'monthly', date: lastMonthStr });
      const result = processRecurring([recurring]);

      expect(result.length).toBe(1);
      expect(result[0].txId).not.toBe(recurring.txId);
      expect(result[0].isRecurring).toBe(true);
    });

    // REQ-07 sc2: recurrente al día — no duplica si ya existe en período
    it('does not duplicate recurring if already generated this period', () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = localDateStr(lastMonth);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthStr = localDateStr(thisMonth);

      const original = mockTx({ isRecurring: true, recurrenceRule: 'monthly', date: lastMonthStr });
      const alreadyGenerated = mockTx({ txId: 'tx-002', isRecurring: true, recurrenceRule: 'monthly', date: thisMonthStr });
      const result = processRecurring([original, alreadyGenerated]);

      expect(result.length).toBe(0);
    });
  });
});
