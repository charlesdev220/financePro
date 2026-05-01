import { AnalyticsService, MonthlyTotal, CategorySpendingItem } from '../../../../features/analytics/services/analytics.service';
import { ITransaction } from '../../../../models/transaction.model';
import { ICategory } from '../../../../models/category.model';

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
    workspaceId: 'ws_test',
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
      const txs: ITransaction[] = [
        tx('t1', 'income',  1000, '2026-01-10'),
        tx('t2', 'expense',  200, '2026-01-15'),
        tx('t3', 'income',  1500, '2026-02-05'),
        tx('t4', 'expense',  300, '2026-02-20'),
        tx('t5', 'income',  2000, '2026-03-01'),
        tx('t6', 'expense',  400, '2026-03-25'),
      ];

      const result = service.getMonthlyTotals(txs, 3);

      expect(result.length).toBe(3);
      expect(result[0]).toEqual({ period: '2026-01', income: 1000, expense: 200 });
      expect(result[1]).toEqual({ period: '2026-02', income: 1500, expense: 300 });
      expect(result[2]).toEqual({ period: '2026-03', income: 2000, expense: 400 });
    });

    // REQ-01 sc2: mes sin income → income: 0
    it('getMonthlyTotals_shouldSetIncomeZero_whenMonthHasOnlyExpenses', () => {
      const txs: ITransaction[] = [
        tx('t1', 'expense', 150, '2026-01-10'),
      ];

      const result = service.getMonthlyTotals(txs, 3);

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
      const txs: ITransaction[] = [
        tx('t1', 'income', 100, '2025-11-01'),
        tx('t2', 'income', 100, '2025-12-01'),
        tx('t3', 'income', 100, '2026-01-01'),
        tx('t4', 'income', 100, '2026-02-01'),
        tx('t5', 'income', 100, '2026-03-01'),
      ];

      const result = service.getMonthlyTotals(txs, 3);

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
      const txs: ITransaction[] = [
        tx('t1', 'expense', 100, '2026-01-01', 'cat-1'),
        tx('t2', 'expense', 200, '2026-01-02', 'cat-2'),
        tx('t3', 'expense',  50, '2026-01-03', 'cat-1'),
      ];

      const result = service.getCategoryTotals(txs);

      expect(result.length).toBe(2);
      const cat1 = result.find(r => r.categoryId === 'cat-1');
      expect(cat1?.total).toBe(150);
    });

    // REQ-02 sc2: filtro por categoryId → solo esa categoría
    it('getCategoryTotals_shouldReturnOnlyFilteredCategory_whenCategoryIdPassed', () => {
      const txs: ITransaction[] = [
        tx('t1', 'expense', 100, '2026-01-01', 'cat-1'),
        tx('t2', 'expense', 200, '2026-01-02', 'cat-2'),
      ];

      const result = service.getCategoryTotals(txs, 'cat-1');

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
      const points = [{ x: 1, y: 10 }, { x: 2, y: 20 }, { x: 3, y: 30 }];

      const result = service.linearRegression(points);

      expect(result.slope).toBe(10);
      expect(result.intercept).toBe(0);
    });

    // REQ-03 sc2: datos con ruido → slope positivo
    it('linearRegression_shouldReturnPositiveSlope_whenDataHasPositiveTrend', () => {
      const points = [
        { x: 1, y: 100 }, { x: 2, y: 250 }, { x: 3, y: 180 },
        { x: 4, y: 320 }, { x: 5, y: 400 },
      ];

      const result = service.linearRegression(points);

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
      const txs: ITransaction[] = [
        tx('t1', 'expense', 100, '2026-01-01', 'cat-1', 'Netflix', true),
      ];

      const result = service.classifySpending(txs, ['2026-01']);

      expect(result.recurrentes.some(i => i.concept === 'Netflix')).toBe(true);
    });

    // REQ-04 sc2: concepto en ≥3 períodos → en recurrentes
    it('classifySpending_shouldIncludeInRecurrentes_whenConceptAppearsInThreeOrMorePeriods', () => {
      const txs: ITransaction[] = [
        tx('t1', 'expense', 100, '2026-01-01', 'cat-1', 'Gym'),
        tx('t2', 'expense', 100, '2026-02-01', 'cat-1', 'Gym'),
        tx('t3', 'expense', 100, '2026-03-01', 'cat-1', 'Gym'),
      ];

      const result = service.classifySpending(txs, ['2026-01', '2026-02', '2026-03']);

      expect(result.recurrentes.some(i => i.concept === 'Gym')).toBe(true);
    });

    // REQ-04 sc3: amountBase ≥ P75 (con ≥4 gastos) → en superfluos
    it('classifySpending_shouldIncludeInSuperfluos_whenAmountBaseAboveP75', () => {
      const txs: ITransaction[] = [
        tx('t1', 'expense', 100, '2026-01-01', 'cat-1', 'A'),
        tx('t2', 'expense', 200, '2026-01-02', 'cat-1', 'B'),
        tx('t3', 'expense', 300, '2026-01-03', 'cat-1', 'C'),
        tx('t4', 'expense', 400, '2026-01-04', 'cat-1', 'D'),
      ];

      const result = service.classifySpending(txs, ['2026-01']);

      expect(result.superfluos.length).toBeGreaterThan(0);
      expect(result.superfluos[0].amountBase).toBeGreaterThanOrEqual(300);
    });

    // REQ-04 sc4: < 4 gastos → superfluos vacío
    it('classifySpending_shouldReturnEmptySuperfluos_whenFewerThanFourExpenses', () => {
      const txs: ITransaction[] = [
        tx('t1', 'expense', 100, '2026-01-01'),
        tx('t2', 'expense', 200, '2026-01-02'),
        tx('t3', 'expense', 300, '2026-01-03'),
      ];

      const result = service.classifySpending(txs, ['2026-01']);

      expect(result.superfluos).toEqual([]);
    });

    // REQ-04 sc5: sin gastos (solo income) → ambas listas vacías
    it('classifySpending_shouldReturnEmptyBothLists_whenNoExpenses', () => {
      const txs: ITransaction[] = [
        tx('t1', 'income', 2000, '2026-01-01'),
      ];

      const result = service.classifySpending(txs, ['2026-01']);

      expect(result.recurrentes).toEqual([]);
      expect(result.superfluos).toEqual([]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // REQ-09: getCategorySpending
  // ───────────────────────────────────────────────────────────────────────────
  describe('getCategorySpending', () => {
    function cat(id: string, name: string, icon: string, color: string): ICategory {
      return {
        categoryId: id,
        userId: 'u1',
        name,
        icon,
        color,
        type: 'expense',
        budgetAmount: null,
        budgetPeriod: 'monthly',
        isActive: true,
        workspaceId: 'ws_test',
        createdAt: '2026-01-01T00:00:00Z',
      };
    }

    const categories: ICategory[] = [
      cat('cat-1', 'Comida',     '🍔', '#4CAF50'),
      cat('cat-2', 'Transporte', '🚗', '#2196F3'),
      cat('cat-3', 'Ocio',       '🎮', '#FF9800'),
    ];

    // REQ-09 sc1: transacciones mixtas → solo EXPENSE acumuladas
    it('getCategorySpending_shouldIncludeOnlyExpenses_whenMixedTransactions', () => {
      const txs: ITransaction[] = [
        tx('t1', 'income',  1000, '2026-04-01', 'cat-1'),
        tx('t2', 'expense',  300, '2026-04-05', 'cat-2'),
        tx('t3', 'expense',  150, '2026-04-10', 'cat-2'),
      ];

      const result: CategorySpendingItem[] = service.getCategorySpending(txs, categories);

      expect(result.length).toBe(1);
      expect(result[0].categoryId).toBe('cat-2');
      expect(result[0].total).toBe(450);
    });

    // REQ-09 sc2: sin gastos → []
    it('getCategorySpending_shouldReturnEmpty_whenNoExpenses', () => {
      const txs: ITransaction[] = [
        tx('t1', 'income', 500, '2026-04-01', 'cat-1'),
      ];

      const result = service.getCategorySpending(txs, categories);

      expect(result).toEqual([]);
    });

    // REQ-09 sc3: categoría sin match → fallback name/icon/color
    it('getCategorySpending_shouldUseFallbacks_whenCategoryNotFound', () => {
      const txs: ITransaction[] = [
        tx('t1', 'expense', 200, '2026-04-01', 'cat-unknown'),
      ];

      const result = service.getCategorySpending(txs, categories);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Otros');
      expect(result[0].icon).toBe('💰');
      expect(result[0].color).toBe('#9E9E9E');
    });

    // REQ-09 sc4: varios gastos → ordenados DESC por total
    it('getCategorySpending_shouldOrderDescByTotal', () => {
      const txs: ITransaction[] = [
        tx('t1', 'expense', 500, '2026-04-01', 'cat-1'),
        tx('t2', 'expense', 200, '2026-04-02', 'cat-2'),
        tx('t3', 'expense', 800, '2026-04-03', 'cat-3'),
      ];

      const result = service.getCategorySpending(txs, categories);

      expect(result[0].categoryId).toBe('cat-3');
      expect(result[0].total).toBe(800);
      expect(result[1].categoryId).toBe('cat-1');
      expect(result[1].total).toBe(500);
      expect(result[2].categoryId).toBe('cat-2');
      expect(result[2].total).toBe(200);
    });

    // REQ-09 sc5: metadatos correctamente enriquecidos
    it('getCategorySpending_shouldEnrichWithCategoryMetadata', () => {
      const txs: ITransaction[] = [
        tx('t1', 'expense', 300, '2026-04-01', 'cat-1'),
      ];

      const result = service.getCategorySpending(txs, categories);

      expect(result[0].name).toBe('Comida');
      expect(result[0].icon).toBe('🍔');
      expect(result[0].color).toBe('#4CAF50');
    });
  });
});
