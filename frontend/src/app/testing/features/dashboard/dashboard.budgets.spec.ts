import { IBudget } from '@models/budget.model';
import { MOCK_WORKSPACE_ID_A } from '../../fixtures';

// ─────────────────────────────────────────────────────────────────────────────
// budgetsForPeriod filter logic — REQ-13
// Tests the pure filtering logic extracted from DashboardPage.budgetsForPeriod
// ─────────────────────────────────────────────────────────────────────────────

function filterBudgetsForPeriod(budgets: IBudget[], period: string): IBudget[] {
  const today = new Date().toISOString().slice(0, 10);
  return budgets.filter(b => {
    if (b.mode === 'disabled') return false;
    if (b.mode === 'period') {
      return !!b.startDate && !!b.endDate && today >= b.startDate && today <= b.endDate;
    }
    return b.period === period;
  });
}

const BASE_BUDGET: IBudget = {
  budgetId: 'bgt-test',
  userId: 'usr_001',
  categoryId: 'cat-001',
  period: '2026-04',
  spentAmount: 0,
  budgetAmount: 500,
  status: 'ok',
  lastUpdated: '2026-04-01T00:00:00Z',
  workspaceId: MOCK_WORKSPACE_ID_A,
  mode: 'indefinite',
};

describe('budgetsForPeriod filter logic — REQ-13', () => {
  const PERIOD = '2026-04';

  // REQ-13 sc1 — mode = 'disabled' → no aparece
  it('excludes_budget_with_mode_disabled', () => {
    const budget: IBudget = { ...BASE_BUDGET, mode: 'disabled' };

    const result = filterBudgetsForPeriod([budget], PERIOD);

    expect(result.length).toBe(0);
  });

  // REQ-13 sc2 — mode = 'indefinite' → siempre aparece si el período coincide
  it('includes_budget_with_mode_indefinite_when_period_matches', () => {
    const budget: IBudget = { ...BASE_BUDGET, mode: 'indefinite', period: PERIOD };

    const result = filterBudgetsForPeriod([budget], PERIOD);

    expect(result.length).toBe(1);
  });

  // REQ-13 sc3 — mode = 'indefinite', período distinto → no aparece
  it('excludes_budget_with_mode_indefinite_when_period_does_not_match', () => {
    const budget: IBudget = { ...BASE_BUDGET, mode: 'indefinite', period: '2025-12' };

    const result = filterBudgetsForPeriod([budget], PERIOD);

    expect(result.length).toBe(0);
  });

  // REQ-13 sc4 — mode = 'period' con rango que incluye hoy → aparece
  it('includes_budget_with_mode_period_when_today_is_within_range', () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const budget: IBudget = { ...BASE_BUDGET, mode: 'period', startDate: yesterday, endDate: tomorrow };

    const result = filterBudgetsForPeriod([budget], PERIOD);

    expect(result.length).toBe(1);
  });

  // REQ-13 sc5 — mode = 'period' con rango pasado → no aparece
  it('excludes_budget_with_mode_period_when_range_is_in_the_past', () => {
    const budget: IBudget = {
      ...BASE_BUDGET,
      mode: 'period',
      startDate: '2020-01-01',
      endDate: '2020-12-31',
    };

    const result = filterBudgetsForPeriod([budget], PERIOD);

    expect(result.length).toBe(0);
  });

  // REQ-13 sc6 — mode = 'period' sin startDate/endDate → no aparece
  it('excludes_budget_with_mode_period_when_dates_are_missing', () => {
    const budget: IBudget = { ...BASE_BUDGET, mode: 'period', startDate: undefined, endDate: undefined };

    const result = filterBudgetsForPeriod([budget], PERIOD);

    expect(result.length).toBe(0);
  });

  // REQ-13 sc7 — mezcla de modos → solo los válidos aparecen
  it('correctly_filters_mixed_mode_budgets', () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

    const budgets: IBudget[] = [
      { ...BASE_BUDGET, budgetId: 'b1', mode: 'indefinite', period: PERIOD },
      { ...BASE_BUDGET, budgetId: 'b2', mode: 'disabled' },
      { ...BASE_BUDGET, budgetId: 'b3', mode: 'period', startDate: yesterday, endDate: tomorrow },
      { ...BASE_BUDGET, budgetId: 'b4', mode: 'period', startDate: '2020-01-01', endDate: '2020-12-31' },
    ];

    const result = filterBudgetsForPeriod(budgets, PERIOD);

    expect(result.length).toBe(2);
    expect(result.map(b => b.budgetId)).toEqual(['b1', 'b3']);
  });
});
