import { rowToBudget, budgetToRow, calculateStatus } from '@features/budgets/services/budget.service';
import { IBudget } from '@models/budget.model';

// ─────────────────────────────────────────────────────────────────────────────
// calculateStatus — función pura
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateStatus', () => {
  it('returns ok when spent is below 80%', () => {
    expect(calculateStatus(300, 500)).toBe('ok');
  });

  it('returns warning when spent is between 80% and 99%', () => {
    expect(calculateStatus(420, 500)).toBe('warning');
  });

  it('returns exceeded when spent is >= 100%', () => {
    expect(calculateStatus(520, 500)).toBe('exceeded');
  });

  it('returns warning at exactly 80%', () => {
    expect(calculateStatus(400, 500)).toBe('warning');
  });

  it('returns exceeded at exactly 100%', () => {
    expect(calculateStatus(500, 500)).toBe('exceeded');
  });

  it('returns ok when spent is 0', () => {
    expect(calculateStatus(0, 500)).toBe('ok');
  });

  it('returns exceeded when budgetAmount is 0', () => {
    expect(calculateStatus(0, 0)).toBe('exceeded');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rowToBudget / budgetToRow — mappers puros
// ─────────────────────────────────────────────────────────────────────────────
describe('budget.service pure functions', () => {
  describe('rowToBudget / budgetToRow', () => {
    it('round-trips a budget through row format', () => {
      const row = ['bgt_1', 'usr_1', 'cat_1', '2024-01', '100', '50', 'warning', '2024-01-15T00:00:00.000Z', 'ws_1', 'indefinite', '', ''];
      const budget = rowToBudget(row, 'ws_default');
      expect(budget.budgetId).toBe('bgt_1');
      expect(budget.budgetAmount).toBe(100);
      expect(budget.spentAmount).toBe(50);
      expect(budget.status).toBe('warning');
      const backToRow = budgetToRow(budget);
      expect(backToRow[0]).toBe('bgt_1');
      expect(backToRow[4]).toBe(100);
    });

    it('maps all fields from schema BUDGETS A:L correctly', () => {
      const row = ['b-001', 'u-001', 'cat-food', '2026-04', '500', '320', 'ok', '2026-04-12T00:00:00Z', 'ws_1', 'indefinite', '', ''];
      const budget: IBudget = rowToBudget(row);

      expect(budget.budgetId).toBe('b-001');
      expect(budget.userId).toBe('u-001');
      expect(budget.categoryId).toBe('cat-food');
      expect(budget.period).toBe('2026-04');
      expect(budget.budgetAmount).toBe(500);
      expect(budget.spentAmount).toBe(320);
      expect(budget.status).toBe('ok');
      expect(budget.lastUpdated).toBe('2026-04-12T00:00:00Z');
    });

    it('converts amount fields to numbers', () => {
      const row = ['b-002', 'u-001', 'cat-1', '2026-04', '1000', '850', 'warning', '2026-04-01T00:00:00Z', 'ws_1', 'indefinite', '', ''];
      const budget = rowToBudget(row);

      expect(typeof budget.budgetAmount).toBe('number');
      expect(typeof budget.spentAmount).toBe('number');
      expect(budget.budgetAmount).toBe(1000);
      expect(budget.spentAmount).toBe(850);
    });

    it('defaults to empty string and 0 for missing or undefined cells', () => {
      const partialRow: unknown[] = [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined];
      const budget = rowToBudget(partialRow);

      expect(budget.budgetId).toBe('');
      expect(budget.userId).toBe('');
      expect(budget.budgetAmount).toBe(0);
      expect(budget.spentAmount).toBe(0);
      expect(budget.status).toBe('ok');
    });

    it('defaults mode to indefinite when row[9] is empty', () => {
      const row = ['b-001', 'u-001', 'cat-1', '2026-04', '500', '0', 'ok', '2026-04-01T00:00:00Z', 'ws_aaa', ''];
      const budget = rowToBudget(row);
      expect(budget.mode).toBe('indefinite');
    });

    it('parses mode period with startDate and endDate', () => {
      const row = ['b-002', 'u-001', 'cat-1', '2026-04', '500', '0', 'ok', '2026-04-01T00:00:00Z', 'ws_aaa', 'period', '2026-01-01', '2026-03-31'];
      const budget = rowToBudget(row);
      expect(budget.mode).toBe('period');
      expect(budget.startDate).toBe('2026-01-01');
      expect(budget.endDate).toBe('2026-03-31');
    });

    it('parses mode disabled', () => {
      const row = ['b-003', 'u-001', 'cat-1', '2026-04', '500', '0', 'ok', '2026-04-01T00:00:00Z', 'ws_aaa', 'disabled'];
      const budget = rowToBudget(row);
      expect(budget.mode).toBe('disabled');
      expect(budget.startDate).toBeUndefined();
      expect(budget.endDate).toBeUndefined();
    });

    it('defaults workspaceId to defaultWsId when row[8] is empty', () => {
      const row = ['b-004', 'u-001', 'cat-1', '2026-04', '500', '0', 'ok', '2026-04-01T00:00:00Z', ''];
      const budget = rowToBudget(row, 'ws_default');
      expect(budget.workspaceId).toBe('ws_default');
    });
  });
});
