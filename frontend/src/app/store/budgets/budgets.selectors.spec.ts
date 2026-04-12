import { selectBudgetForCategory, selectExceededBudgets } from './budgets.selectors';
import { IBudget } from '../../models/budget.model';
import { AppState } from '../app.state';

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function mockBudget(catId: string, period: string, status: IBudget['status']): IBudget {
  return {
    budgetId: `b-${catId}-${period}`,
    userId: 'u1',
    categoryId: catId,
    period,
    budgetAmount: 500,
    spentAmount: status === 'ok' ? 200 : status === 'warning' ? 430 : 550,
    status,
    lastUpdated: '2026-04-12T00:00:00Z',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado base — mismo esquema que AppState del proyecto
// ─────────────────────────────────────────────────────────────────────────────
const emptyAppState: AppState = {
  transactions: { items: [], rowMap: {}, loading: false, error: null },
  wallets: { items: [], rowMap: {}, loading: false, error: null },
  budgets: { items: [], rowMap: {}, loading: false, error: null },
  categories: { items: [], rowMap: {}, loading: false, error: null },
  currency: { rates: {}, loading: false, error: null },
};

// ─────────────────────────────────────────────────────────────────────────────
// Budgets Selectors
// ─────────────────────────────────────────────────────────────────────────────
describe('Budgets Selectors', () => {
  const budgetCat1Apr: IBudget = mockBudget('cat-1', '2026-04', 'ok');
  const budgetCat2Apr: IBudget = mockBudget('cat-2', '2026-04', 'warning');
  const budgetCat3Apr: IBudget = mockBudget('cat-3', '2026-04', 'exceeded');
  const budgetCat1Mar: IBudget = mockBudget('cat-1', '2026-03', 'ok'); // período diferente

  const stateWithBudgets: AppState = {
    ...emptyAppState,
    budgets: {
      items: [budgetCat1Apr, budgetCat2Apr, budgetCat3Apr, budgetCat1Mar],
      rowMap: {},
      loading: false,
      error: null,
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // selectBudgetForCategory
  // ─────────────────────────────────────────────────────────────────────────
  describe('selectBudgetForCategory', () => {
    it('selectBudgetForCategory_shouldReturnBudget_whenCategoryAndPeriodMatch', () => {
      // When
      const result = selectBudgetForCategory('cat-1', '2026-04')(stateWithBudgets);

      // Then
      expect(result).toEqual(budgetCat1Apr);
    });

    it('selectBudgetForCategory_shouldReturnNull_whenCategoryDoesNotExist', () => {
      // When
      const result = selectBudgetForCategory('cat-999', '2026-04')(stateWithBudgets);

      // Then
      expect(result).toBeNull();
    });

    it('selectBudgetForCategory_shouldReturnNull_whenPeriodDoesNotMatch', () => {
      // Given: cat-1 existe en 2026-04 pero no en 2026-05
      // When
      const result = selectBudgetForCategory('cat-1', '2026-05')(stateWithBudgets);

      // Then
      expect(result).toBeNull();
    });

    it('selectBudgetForCategory_shouldReturnNull_whenBudgetItemsAreEmpty', () => {
      // When
      const result = selectBudgetForCategory('cat-1', '2026-04')(emptyAppState);

      // Then
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // selectExceededBudgets
  // ─────────────────────────────────────────────────────────────────────────
  describe('selectExceededBudgets', () => {
    it('selectExceededBudgets_shouldReturnOnlyExceededBudgets_forGivenPeriod', () => {
      // When
      const result = selectExceededBudgets('2026-04')(stateWithBudgets);

      // Then
      expect(result.length).toBe(1);
      expect(result[0].categoryId).toBe('cat-3');
      expect(result[0].status).toBe('exceeded');
    });

    it('selectExceededBudgets_shouldReturnEmptyArray_whenNoExceededBudgets', () => {
      // Given: solo budgets ok/warning en ese período
      const state: AppState = {
        ...emptyAppState,
        budgets: {
          items: [budgetCat1Apr, budgetCat2Apr],
          rowMap: {},
          loading: false,
          error: null,
        },
      };

      // When
      const result = selectExceededBudgets('2026-04')(state);

      // Then
      expect(result).toEqual([]);
    });

    it('selectExceededBudgets_shouldNotReturnExceededFromDifferentPeriod', () => {
      // Given: hay un exceeded en 2026-03 pero consultamos 2026-04
      const stateWithOldExceeded: AppState = {
        ...emptyAppState,
        budgets: {
          items: [budgetCat1Apr, mockBudget('cat-5', '2026-03', 'exceeded')],
          rowMap: {},
          loading: false,
          error: null,
        },
      };

      // When
      const result = selectExceededBudgets('2026-04')(stateWithOldExceeded);

      // Then
      expect(result).toEqual([]);
    });

    it('selectExceededBudgets_shouldReturnEmptyArray_whenBudgetItemsAreEmpty', () => {
      // When
      const result = selectExceededBudgets('2026-04')(emptyAppState);

      // Then
      expect(result).toEqual([]);
    });
  });
});
