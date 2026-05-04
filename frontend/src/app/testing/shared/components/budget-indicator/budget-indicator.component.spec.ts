import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { BudgetIndicatorComponent } from '@shared/components/budget-indicator/budget-indicator.component';
import { IBudget } from '@models/budget.model';

describe('BudgetIndicatorComponent', () => {
  let spectator: Spectator<BudgetIndicatorComponent>;
  const CAT_COLOR = '#4CAF50';

  const createComponent = createComponentFactory({
    component: BudgetIndicatorComponent,
  });

  function buildBudget(
    spentAmount: number,
    budgetAmount: number,
    status: IBudget['status'],
  ): IBudget {
    return {
      budgetId: 'b-test',
      userId: 'u1',
      categoryId: 'cat-1',
      period: '2026-04',
      spentAmount,
      budgetAmount,
      status,
      lastUpdated: '2026-04-12T00:00:00Z',
      workspaceId: 'ws_test',
      mode: 'indefinite' as const,
    };
  }

  beforeEach(() => {
    spectator = createComponent({
      props: {
        catColor: CAT_COLOR,
        budget: buildBudget(0, 100, 'ok')
      }
    });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  // sc1: gasto bajo (< 80%) → pct correcto, barColor = catColor
  it('pct_shouldBe40AndBarColorIsCatColor_whenUnder80Percent', () => {
    spectator.setInput('budget', buildBudget(200, 500, 'ok'));

    expect(spectator.component.pct()).toBe(40);
    expect(spectator.component.barColor()).toBe(CAT_COLOR);
  });

  // sc2: gasto al 86% (>= 80%) → barColor = rojo myfinance
  it('barColor_shouldBeRed_whenPctIsOver80', () => {
    spectator.setInput('budget', buildBudget(430, 500, 'warning'));

    expect(spectator.component.pct()).toBe(86);
    expect(spectator.component.barColor()).toBe('#E57373');
  });

  // sc3: gasto que supera el 100% → pct clamped a 100, barColor rojo
  it('pct_shouldBeClampedTo100AndBarColorRed_whenExceeded', () => {
    spectator.setInput('budget', buildBudget(600, 500, 'exceeded'));

    expect(spectator.component.pct()).toBe(100);
    expect(spectator.component.barColor()).toBe('#E57373');
  });

  // sc4: gasto exactamente al 100% → pct 100, rojo
  it('pct_shouldBe100AndBarColorRed_whenSpentEqualsbudget', () => {
    spectator.setInput('budget', buildBudget(500, 500, 'exceeded'));

    expect(spectator.component.pct()).toBe(100);
    expect(spectator.component.barColor()).toBe('#E57373');
  });

  // sc5: límite inferior de rojo exactamente al 80% → rojo
  it('barColor_shouldBeRed_whenPctIsExactly80', () => {
    spectator.setInput('budget', buildBudget(400, 500, 'warning'));

    expect(spectator.component.pct()).toBe(80);
    expect(spectator.component.barColor()).toBe('#E57373');
  });

  // sc6: budgetAmount = 0 → pct = 0, sin división por cero
  it('pct_shouldBe0_whenBudgetAmountIsZero', () => {
    spectator.setInput('budget', buildBudget(0, 0, 'ok'));

    expect(spectator.component.pct()).toBe(0);
  });
});
