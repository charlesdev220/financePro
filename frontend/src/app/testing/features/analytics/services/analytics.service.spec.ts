import { AnalyticsService, MonthlyTotal } from '../../../../features/analytics/services/analytics.service';
import { ITransaction } from '../../../../models/transaction.model';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers inline
// ─────────────────────────────────────────────────────────────────────────────
function tx(
  id: string,
  type: 'income' | 'expense',
  amount: number,
  date: string,
  catId = 'cat-1',
  concept = 'concepto',
  isRecurring = false,
): ITransaction {
  return {
    txId: id,
    userId: 'u1',
    walletId: 'w1',
    categoryId: catId,
    amount,
    currency: 'USD',
    amountBase: amount,
    concept,
    date,
    type,
    isRecurring,
    recurrenceRule: null,
    notes: null,
    createdAt: date + 'T00:00:00Z',
    updatedAt: date + 'T00:00:00Z',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalyticsService — servicio puro, instanciado directamente
// ─────────────────────────────────────────────────────────────────────────────
describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // REQ-01: getMonthlyTotals
  // ───────────────────────────────────────────────────────────────────────────
  describe('getMonthlyTotals', () => {

    // REQ-01 sc1: txs mixtas en 3 meses → totales correctos por mes
    it('getMonthlyTotals_shouldReturnCorrectTotals_whenMixedTxsInThreeMonths', () => {
      // Given
      const txs: ITransaction[] = [
        tx('t1', 'income',  1000, '2026-01-10'),
        tx('t2', 'expense',  200, '2026-01-15'),
        tx('t3', 'income',  1500, '2026-02-05'),
        tx('t4', 'expense',  300, '2026-02-20'),
        tx('t5', 'income',  2000, '2026-03-01'),
        tx('t6', 'expense',  400, '2026-03-25'),
      ];

      // When
      const result = service.getMonthlyTotals(txs, 3);

      // Then
      expect(result.length).toBe(3);
      expect(result[0]).toEqual({ period: '2026-01', income: 1000, expense: 200 });
      expect(result[1]).toEqual({ period: '2026-02', income: 1500, expense: 300 });
      expect(result[2]).toEqual({ period: '2026-03', income: 2000, expense: 400 });
    });

    // REQ-01 sc2: mes sin income → income: 0
    it('getMonthlyTotals_shouldSetIncomeZero_whenMonthHasOnlyExpenses', () => {
      // Given
      const txs: ITransaction[] = [
        tx('t1', 'expense', 150, '2026-01-10'),
      ];

      // When
      const result = service.getMonthlyTotals(txs, 3);

      // Then
      expect(result.length).toBe(1);
      expect(result[0].income).toBe(0);
      expect(result[0].expense).toBe(150);
    });

    // REQ-01 sc3: array vacío → []
    it('getMonthlyTotals_shouldReturnEmpty_whenNoTransactions', () => {
      expect(service.getMonthlyTotals([], 3)).toEqual([]);
    });

    // slice: solo devuelve los últimos N meses con datos
    it('getMonthlyTotals_shouldReturnLastNMonths_whenMoreDataExists', () => {
      // Given: 5 meses de datos, pedimos 3
      const txs: ITransaction[] = [
        tx('t1', 'income', 100, '2025-11-01'),
        tx('t2', 'income', 100, '2025-12-01'),
        tx('t3', 'income', 100, '2026-01-01'),
        tx('t4', 'income', 100, '2026-02-01'),
        tx('t5', 'income', 100, '2026-03-01'),
      ];

      // When
      const result = service.getMonthlyTotals(txs, 3);

      // Then
      expect(result.length).toBe(3);
      expect(result[0].period).toBe('2026-01');
      expect(result[2].period).toBe('2026-03');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // REQ-02: getCategoryTotals
  // ───────────────────────────────────────────────────────────────────────────
  describe('getCategoryTotals', () => {

    // REQ-02 sc1: sin filtro → una entrada por categoría
    it('getCategoryTotals_shouldReturnOneEntryPerCategory_whenNoFilter', () => {
      // Given
      const txs: ITransaction[] = [
        tx('t1', 'expense', 100, '2026-01-01', 'cat-1'),
        tx('t2', 'expense', 200, '2026-01-02', 'cat-2'),
        tx('t3', 'expense',  50, '2026-01-03', 'cat-1'),
      ];

      // When
      const result = service.getCategoryTotals(txs);

      // Then
      expect(result.length).toBe(2);
      const cat1 = result.find(r => r.categoryId === 'cat-1');
      expect(cat1?.total).toBe(150);
    });

    // REQ-02 sc2: filtro por categoryId → solo esa categoría
    it('getCategoryTotals_shouldReturnOnlyFilteredCategory_whenCategoryIdPassed', () => {
      // Given
      const txs: ITransaction[] = [
        tx('t1', 'expense', 100, '2026-01-01', 'cat-1'),
        tx('t2', 'expense', 200, '2026-01-02', 'cat-2'),
      ];

      // When
      const result = service.getCategoryTotals(txs, 'cat-1');

      // Then
      expect(result.length).toBe(1);
      expect(result[0].categoryId).toBe('cat-1');
      expect(result[0].total).toBe(100);
    });

    // REQ-02 sc3: categoría inexistente → []
    it('getCategoryTotals_shouldReturnEmpty_whenCategoryNotFound', () => {
      const txs: ITransaction[] = [tx('t1', 'expense', 100, '2026-01-01', 'cat-1')];
      expect(service.getCategoryTotals(txs, 'cat-999')).toEqual([]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // REQ-03: linearRegression
  // ───────────────────────────────────────────────────────────────────────────
  describe('linearRegression', () => {

    // REQ-03 sc1: pendiente exacta = 10
    it('linearRegression_shouldReturnExactSlope_whenPointsAreCollinear', () => {
      // Given
      const points = [{ x: 1, y: 10 }, { x: 2, y: 20 }, { x: 3, y: 30 }];

      // When
      const result = service.linearRegression(points);

      // Then
      expect(result.slope).toBe(10);
      expect(result.intercept).toBe(0);
    });

    // REQ-03 sc2: datos con ruido → slope positivo
    it('linearRegression_shouldReturnPositiveSlope_whenDataHasPositiveTrend', () => {
      // Given
      const points = [
        { x: 1, y: 100 }, { x: 2, y: 250 }, { x: 3, y: 180 },
        { x: 4, y: 320 }, { x: 5, y: 400 },
      ];

      // When
      const result = service.linearRegression(points);

      // Then
      expect(result.slope).toBeGreaterThan(0);
    });

    // REQ-03 sc3: menos de 2 puntos → {slope:0, intercept:0}
    it('linearRegression_shouldReturnZeros_whenFewerThanTwoPoints', () => {
      expect(service.linearRegression([{ x: 1, y: 100 }])).toEqual({ slope: 0, intercept: 0 });
      expect(service.linearRegression([])).toEqual({ slope: 0, intercept: 0 });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // REQ-04: classifySpending
  // ───────────────────────────────────────────────────────────────────────────
  describe('classifySpending', () => {

    // REQ-04 sc1: isRecurring:true → en recurrentes
    it('classifySpending_shouldIncludeInRecurrentes_whenIsRecurringTrue', () => {
      // Given
      const txs: ITransaction[] = [
        tx('t1', 'expense', 100, '2026-01-01', 'cat-1', 'Netflix', true),
      ];

      // When
      const result = service.classifySpending(txs, ['2026-01']);

      // Then
      expect(result.recurrentes.some(i => i.concept === 'Netflix')).toBeTrue();
    });

    // REQ-04 sc2: concepto en ≥3 períodos → en recurrentes
    it('classifySpending_shouldIncludeInRecurrentes_whenConceptAppearsInThreeOrMorePeriods', () => {
      // Given
      const txs: ITransaction[] = [
        tx('t1', 'expense', 100, '2026-01-01', 'cat-1', 'Gym'),
        tx('t2', 'expense', 100, '2026-02-01', 'cat-1', 'Gym'),
        tx('t3', 'expense', 100, '2026-03-01', 'cat-1', 'Gym'),
      ];

      // When
      const result = service.classifySpending(txs, ['2026-01', '2026-02', '2026-03']);

      // Then
      expect(result.recurrentes.some(i => i.concept === 'Gym')).toBeTrue();
    });

    // REQ-04 sc3: amountBase ≥ P75 (con ≥4 gastos) → en superfluos
    it('classifySpending_shouldIncludeInSuperfluos_whenAmountBaseAboveP75', () => {
      // Given: 4 gastos, el más caro (400) supera P75
      const txs: ITransaction[] = [
        tx('t1', 'expense', 100, '2026-01-01', 'cat-1', 'A'),
        tx('t2', 'expense', 200, '2026-01-02', 'cat-1', 'B'),
        tx('t3', 'expense', 300, '2026-01-03', 'cat-1', 'C'),
        tx('t4', 'expense', 400, '2026-01-04', 'cat-1', 'D'),
      ];

      // When
      const result = service.classifySpending(txs, ['2026-01']);

      // Then
      expect(result.superfluos.length).toBeGreaterThan(0);
      expect(result.superfluos[0].amountBase).toBeGreaterThanOrEqual(300);
    });

    // REQ-04 sc4: < 4 gastos → superfluos vacío
    it('classifySpending_shouldReturnEmptySuperfluos_whenFewerThanFourExpenses', () => {
      // Given
      const txs: ITransaction[] = [
        tx('t1', 'expense', 100, '2026-01-01'),
        tx('t2', 'expense', 200, '2026-01-02'),
        tx('t3', 'expense', 300, '2026-01-03'),
      ];

      // When
      const result = service.classifySpending(txs, ['2026-01']);

      // Then
      expect(result.superfluos).toEqual([]);
    });

    // REQ-04 sc5: sin gastos (solo income) → ambas listas vacías
    it('classifySpending_shouldReturnEmptyBothLists_whenNoExpenses', () => {
      // Given
      const txs: ITransaction[] = [
        tx('t1', 'income', 2000, '2026-01-01'),
      ];

      // When
      const result = service.classifySpending(txs, ['2026-01']);

      // Then
      expect(result.recurrentes).toEqual([]);
      expect(result.superfluos).toEqual([]);
    });
  });
});
