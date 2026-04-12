import { DashboardService, DashboardSummary, CategoryBreakdown } from './dashboard.service';
import { ITransaction } from '../../../models/transaction.model';
import { ICategory } from '../../../models/category.model';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers inline — sin dependencias externas
// ─────────────────────────────────────────────────────────────────────────────
function tx(
  id: string,
  type: 'income' | 'expense',
  amount: number,
  date: string,
  catId = 'cat-1',
): ITransaction {
  return {
    txId: id,
    userId: 'u1',
    walletId: 'w1',
    categoryId: catId,
    amount,
    currency: 'EUR',
    amountBase: amount,
    concept: '',
    date,
    type,
    isRecurring: false,
    recurrenceRule: null,
    notes: null,
    createdAt: date + 'T00:00:00Z',
    updatedAt: date + 'T00:00:00Z',
  };
}

function cat(id: string, name: string, color: string): ICategory {
  return {
    categoryId: id,
    userId: 'u1',
    name,
    icon: '📂',
    color,
    type: 'expense',
    budgetAmount: null,
    budgetPeriod: 'monthly',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardService — servicio puro, se instancia directamente
// ─────────────────────────────────────────────────────────────────────────────
describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    service = new DashboardService();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // calculateSummary
  // ─────────────────────────────────────────────────────────────────────────
  describe('calculateSummary', () => {
    // REQ-01 sc1: período con ingresos y gastos → totales y balance correctos
    it('calculateSummary_shouldReturnCorrectTotals_whenPeriodHasIncomesAndExpenses', () => {
      // Given
      const transactions: ITransaction[] = [
        tx('t1', 'income', 2500, '2026-04-01'),
        tx('t2', 'expense', 320, '2026-04-11'),
        tx('t3', 'expense', 180, '2026-04-15'),
        tx('t4', 'income', 500, '2026-03-01'), // período diferente — no debe contar
      ];

      // When
      const summary: DashboardSummary = service.calculateSummary(transactions, '2026-04');

      // Then
      expect(summary.totalIncome).toBe(2500);
      expect(summary.totalExpenses).toBe(500);
      expect(summary.balance).toBe(2000);
    });

    // REQ-01 sc2: período vacío → todos cero
    it('calculateSummary_shouldReturnAllZeros_whenPeriodIsEmpty', () => {
      // Given
      const transactions: ITransaction[] = [
        tx('t1', 'income', 1000, '2026-03-15'),
      ];

      // When
      const summary = service.calculateSummary(transactions, '2026-04');

      // Then
      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpenses).toBe(0);
      expect(summary.balance).toBe(0);
    });

    // REQ-01 sc3: solo gastos → balance negativo
    it('calculateSummary_shouldReturnNegativeBalance_whenOnlyExpenses', () => {
      // Given
      const transactions: ITransaction[] = [
        tx('t1', 'expense', 400, '2026-04-05'),
        tx('t2', 'expense', 200, '2026-04-20'),
      ];

      // When
      const summary = service.calculateSummary(transactions, '2026-04');

      // Then
      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpenses).toBe(600);
      expect(summary.balance).toBe(-600);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // calculateBreakdown
  // ─────────────────────────────────────────────────────────────────────────
  describe('calculateBreakdown', () => {
    const categories: ICategory[] = [
      cat('cat-1', 'Comida', '#4CAF50'),
      cat('cat-2', 'Transporte', '#2196F3'),
      cat('cat-3', 'Ocio', '#FF9800'),
      cat('cat-4', 'Salud', '#F44336'),
      cat('cat-5', 'Ropa', '#9C27B0'),
      cat('cat-6', 'Tecnología', '#00BCD4'),
      cat('cat-7', 'Hogar', '#795548'),
    ];

    // REQ-02 sc1: <= 6 categorías → array sin entrada "Otros"
    it('calculateBreakdown_shouldReturnArrayWithoutOtros_whenSixOrFewerCategories', () => {
      // Given: exactamente 6 categorías distintas con gastos
      const transactions: ITransaction[] = [
        tx('t1', 'expense', 100, '2026-04-01', 'cat-1'),
        tx('t2', 'expense', 80, '2026-04-02', 'cat-2'),
        tx('t3', 'expense', 60, '2026-04-03', 'cat-3'),
        tx('t4', 'expense', 40, '2026-04-04', 'cat-4'),
        tx('t5', 'expense', 20, '2026-04-05', 'cat-5'),
        tx('t6', 'expense', 10, '2026-04-06', 'cat-6'),
      ];

      // When
      const breakdown: CategoryBreakdown[] = service.calculateBreakdown(transactions, categories, '2026-04');

      // Then
      expect(breakdown.length).toBe(6);
      expect(breakdown.find(b => b.categoryId === 'others')).toBeUndefined();
    });

    // REQ-02 sc2: > 6 categorías → top 6 + "Otros" con monto agrupado
    it('calculateBreakdown_shouldReturnTop6PlusOtros_whenMoreThanSixCategories', () => {
      // Given: 7 categorías distintas con gastos
      const transactions: ITransaction[] = [
        tx('t1', 'expense', 200, '2026-04-01', 'cat-1'),
        tx('t2', 'expense', 180, '2026-04-02', 'cat-2'),
        tx('t3', 'expense', 160, '2026-04-03', 'cat-3'),
        tx('t4', 'expense', 140, '2026-04-04', 'cat-4'),
        tx('t5', 'expense', 120, '2026-04-05', 'cat-5'),
        tx('t6', 'expense', 100, '2026-04-06', 'cat-6'),
        tx('t7', 'expense', 50,  '2026-04-07', 'cat-7'), // va a "Otros"
      ];

      // When
      const breakdown = service.calculateBreakdown(transactions, categories, '2026-04');

      // Then
      expect(breakdown.length).toBe(7); // 6 top + Otros
      const otros = breakdown.find(b => b.categoryId === 'others');
      expect(otros).toBeDefined();
      expect(otros!.name).toBe('Otros');
      expect(otros!.amount).toBe(50);
    });

    // REQ-02 sc3: sin gastos → []
    it('calculateBreakdown_shouldReturnEmptyArray_whenNoExpenses', () => {
      // Given: solo ingresos en el período
      const transactions: ITransaction[] = [
        tx('t1', 'income', 2500, '2026-04-01', 'cat-1'),
      ];

      // When
      const breakdown = service.calculateBreakdown(transactions, categories, '2026-04');

      // Then
      expect(breakdown).toEqual([]);
    });

    // REQ-02 sc4: ingresos no se incluyen en el breakdown
    it('calculateBreakdown_shouldIgnoreIncomeTransactions', () => {
      // Given: mix de ingresos y gastos
      const transactions: ITransaction[] = [
        tx('t1', 'income', 2500, '2026-04-01', 'cat-1'),
        tx('t2', 'expense', 100, '2026-04-05', 'cat-2'),
      ];

      // When
      const breakdown = service.calculateBreakdown(transactions, categories, '2026-04');

      // Then
      expect(breakdown.length).toBe(1);
      expect(breakdown[0].categoryId).toBe('cat-2');
      expect(breakdown.find(b => b.categoryId === 'cat-1')).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getRecentTransactions
  // ─────────────────────────────────────────────────────────────────────────
  describe('getRecentTransactions', () => {
    // REQ-06 sc1: más de 5 → retorna exactamente 5
    it('getRecentTransactions_shouldReturnExactlyFive_whenMoreThanFiveTransactions', () => {
      // Given: 7 transacciones en el período
      const transactions: ITransaction[] = [
        tx('t1', 'expense', 10, '2026-04-01'),
        tx('t2', 'expense', 20, '2026-04-02'),
        tx('t3', 'expense', 30, '2026-04-03'),
        tx('t4', 'expense', 40, '2026-04-04'),
        tx('t5', 'expense', 50, '2026-04-05'),
        tx('t6', 'expense', 60, '2026-04-06'),
        tx('t7', 'expense', 70, '2026-04-07'),
      ];

      // When
      const result = service.getRecentTransactions(transactions, '2026-04');

      // Then
      expect(result.length).toBe(5);
    });

    // REQ-06 sc2: menos de 5 → retorna todos
    it('getRecentTransactions_shouldReturnAll_whenFewerThanFiveTransactions', () => {
      // Given: 3 transacciones en el período
      const transactions: ITransaction[] = [
        tx('t1', 'expense', 10, '2026-04-01'),
        tx('t2', 'expense', 20, '2026-04-02'),
        tx('t3', 'income', 500, '2026-04-03'),
      ];

      // When
      const result = service.getRecentTransactions(transactions, '2026-04');

      // Then
      expect(result.length).toBe(3);
    });

    // REQ-06 sc3: ordenadas por fecha DESC (más reciente primero)
    it('getRecentTransactions_shouldOrderByDateDescending', () => {
      // Given: transacciones en orden arbitrario
      const transactions: ITransaction[] = [
        tx('t1', 'expense', 10, '2026-04-01'),
        tx('t3', 'expense', 30, '2026-04-15'),
        tx('t2', 'expense', 20, '2026-04-08'),
      ];

      // When
      const result = service.getRecentTransactions(transactions, '2026-04');

      // Then
      expect(result[0].date).toBe('2026-04-15');
      expect(result[1].date).toBe('2026-04-08');
      expect(result[2].date).toBe('2026-04-01');
    });
  });
});
