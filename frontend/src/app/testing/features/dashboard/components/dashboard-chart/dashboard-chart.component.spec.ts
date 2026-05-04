import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { DashboardChartComponent } from '@features/dashboard/components/dashboard-chart/dashboard-chart.component';
import { CategoryBreakdown } from '@features/dashboard/services/dashboard.service';
import { IBudget } from '@models/budget.model';

function makeBreakdown(overrides: Partial<CategoryBreakdown> = {}): CategoryBreakdown {
  return {
    categoryId: 'cat-1',
    name: 'Comida',
    icon: '🛒',
    color: '#4CAF50',
    amount: 200,
    type: 'expense',
    ...overrides,
  };
}

function makeBudget(overrides: Partial<IBudget> = {}): IBudget {
  return {
    budgetId: 'bgt-1',
    userId: 'usr_001',
    categoryId: 'cat-1',
    period: '2026-04',
    spentAmount: 120,
    budgetAmount: 200,
    status: 'ok',
    lastUpdated: '2026-04-27T00:00:00Z',
    workspaceId: 'ws_test',
    mode: 'indefinite',
    ...overrides,
  };
}

describe('DashboardChartComponent', () => {
  let spectator: Spectator<DashboardChartComponent>;

  const createComponent = createComponentFactory({
    component: DashboardChartComponent,
    shallow: true,
  });

  beforeEach(() => {
    spectator = createComponent({
      props: {
        breakdown: [],
        balance: 0,
        currency: 'EUR'
      }
    });
  });

  it('expenseItems_shouldHaveShowBudgetLabelTrue_whenCategoryHasBudget', () => {
    spectator.setInput('breakdown', [makeBreakdown()]);
    spectator.setInput('balance', 500);
    spectator.setInput('currency', 'EUR');
    spectator.setInput('budgets', [makeBudget({ categoryId: 'cat-1', spentAmount: 120, budgetAmount: 200 })]);

    const items = spectator.component.expenseItems();

    expect(items.length).toBe(1);
    expect(items[0].budgetMeta.showBudgetLabel).toBe(true);
    expect(items[0].budgetMeta.hasBudget).toBe(true);
  });

  it('expenseItems_shouldHaveHasBudgetFalse_whenCategoryHasNoBudget', () => {
    spectator.setInput('breakdown', [makeBreakdown({ categoryId: 'cat-2' })]);
    spectator.setInput('balance', 500);
    spectator.setInput('currency', 'EUR');
    spectator.setInput('budgets', []);

    const items = spectator.component.expenseItems();

    expect(items.length).toBe(1);
    expect(items[0].budgetMeta.showBudgetLabel).toBe(true);
    expect(items[0].budgetMeta.hasBudget).toBe(false);
  });

  it('expenseItems_pilaPercent_shouldBeSpentOverBudget_whenHasBudget', () => {
    spectator.setInput('breakdown', [makeBreakdown({ amount: 200 })]);
    spectator.setInput('balance', 0);
    spectator.setInput('currency', 'EUR');
    spectator.setInput('budgets', [makeBudget({ spentAmount: 120, budgetAmount: 200 })]);

    const pct = spectator.component.expenseItems()[0].budgetMeta.pct;

    expect(pct).toBe(60);
  });
});
