import { calculateStatus, rowToBudget } from '../../../../features/budgets/services/budget.service';
import { IBudget } from '../../../../models/budget.model';

// ─────────────────────────────────────────────────────────────────────────────
// calculateStatus — función pura, no requiere DI
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateStatus', () => {
  // REQ-08 sc1: gasto < 80% → 'ok'
  it('returns ok when spent is below 80%', () => {
    // Given: 300/500 = 60%
    // When
    const result = calculateStatus(300, 500);
    // Then
    expect(result).toBe('ok');
  });

  // REQ-08 sc2: gasto entre 80% y 99% → 'warning'
  it('returns warning when spent is between 80% and 99%', () => {
    // Given: 420/500 = 84%
    // When
    const result = calculateStatus(420, 500);
    // Then
    expect(result).toBe('warning');
  });

  // REQ-08 sc3: gasto >= 100% → 'exceeded'
  it('returns exceeded when spent is >= 100%', () => {
    // Given: 520/500 = 104%
    // When
    const result = calculateStatus(520, 500);
    // Then
    expect(result).toBe('exceeded');
  });

  // REQ-08 sc4: exactamente 80% → 'warning' (límite inferior de warning)
  it('returns warning at exactly 80%', () => {
    // Given: 400/500 = 80%
    // When
    const result = calculateStatus(400, 500);
    // Then
    expect(result).toBe('warning');
  });

  // REQ-08 sc5: exactamente 100% → 'exceeded' (límite inferior de exceeded)
  it('returns exceeded at exactly 100%', () => {
    // Given: 500/500 = 100%
    // When
    const result = calculateStatus(500, 500);
    // Then
    expect(result).toBe('exceeded');
  });

  // REQ-08 sc6: 0 gasto → 'ok'
  it('returns ok when spent is 0', () => {
    // Given: 0/500 = 0%
    // When
    const result = calculateStatus(0, 500);
    // Then
    expect(result).toBe('ok');
  });

  // Edge: budgetAmount <= 0 → siempre 'exceeded' (división por cero protegida)
  it('returns exceeded when budgetAmount is 0', () => {
    // Given: cualquier gasto con presupuesto 0
    // When
    const result = calculateStatus(0, 0);
    // Then
    expect(result).toBe('exceeded');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rowToBudget — mapper de los 8 campos del schema BUDGETS A:H
// ─────────────────────────────────────────────────────────────────────────────
describe('rowToBudget', () => {
  const mockRow = [
    'b-001',          // A: budget_id
    'u-001',          // B: user_id
    'cat-food',       // C: category_id
    '2026-04',        // D: period
    '500',            // E: budget_amount
    '320',            // F: spent_amount
    'ok',             // G: status
    '2026-04-12T00:00:00Z', // H: last_updated
  ];

  it('maps all 8 fields from schema BUDGETS A:H correctly', () => {
    // When
    const budget: IBudget = rowToBudget(mockRow);

    // Then
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
    // Given: valores como strings (tal como llegan de Sheets API)
    const row = ['b-002', 'u-001', 'cat-1', '2026-04', '1000', '850', 'warning', '2026-04-01T00:00:00Z'];

    // When
    const budget = rowToBudget(row);

    // Then
    expect(typeof budget.budgetAmount).toBe('number');
    expect(typeof budget.spentAmount).toBe('number');
    expect(budget.budgetAmount).toBe(1000);
    expect(budget.spentAmount).toBe(850);
  });

  it('defaults to empty string and 0 for missing or undefined cells', () => {
    // Given: fila parcialmente vacía
    const partialRow: unknown[] = [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined];

    // When
    const budget = rowToBudget(partialRow);

    // Then
    expect(budget.budgetId).toBe('');
    expect(budget.userId).toBe('');
    expect(budget.budgetAmount).toBe(0);
    expect(budget.spentAmount).toBe(0);
    expect(budget.status).toBe('ok'); // default fallback
  });
});
