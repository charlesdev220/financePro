import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetIndicatorComponent } from '../../../../shared/components/budget-indicator/budget-indicator.component';
import { IBudget } from '../../../../models/budget.model';

// ─────────────────────────────────────────────────────────────────────────────
// BudgetIndicatorComponent — computed pct y barColor
// ─────────────────────────────────────────────────────────────────────────────
describe('BudgetIndicatorComponent', () => {
  let component: BudgetIndicatorComponent;
  let fixture: ComponentFixture<BudgetIndicatorComponent>;

  const CAT_COLOR = '#4CAF50';

  function buildBudget(
    spentAmount: number,
    budgetAmount: number,
    status: IBudget['status'],
  ): IBudget {
    return {
      budgetId:    'b-test',
      userId:      'u1',
      categoryId:  'cat-1',
      period:      '2026-04',
      spentAmount,
      budgetAmount,
      status,
      lastUpdated:  '2026-04-12T00:00:00Z',
      workspaceId:  'ws_test',
      mode:         'indefinite' as const,
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetIndicatorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('catColor', CAT_COLOR);
  });

  // sc1: gasto bajo (< 80%) → pct correcto, barColor = catColor
  it('pct_shouldBe40AndBarColorIsCatColor_whenUnder80Percent', () => {
    fixture.componentRef.setInput('budget', buildBudget(200, 500, 'ok'));
    fixture.detectChanges();

    expect(component.pct()).toBe(40);
    expect(component.barColor()).toBe(CAT_COLOR);
  });

  // sc2: gasto al 86% (>= 80%) → barColor = rojo monefy
  it('barColor_shouldBeRed_whenPctIsOver80', () => {
    fixture.componentRef.setInput('budget', buildBudget(430, 500, 'warning'));
    fixture.detectChanges();

    expect(component.pct()).toBe(86);
    expect(component.barColor()).toBe('#E57373');
  });

  // sc3: gasto que supera el 100% → pct clamped a 100, barColor rojo
  it('pct_shouldBeClampedTo100AndBarColorRed_whenExceeded', () => {
    fixture.componentRef.setInput('budget', buildBudget(600, 500, 'exceeded'));
    fixture.detectChanges();

    expect(component.pct()).toBe(100);
    expect(component.barColor()).toBe('#E57373');
  });

  // sc4: gasto exactamente al 100% → pct 100, rojo
  it('pct_shouldBe100AndBarColorRed_whenSpentEqualsbudget', () => {
    fixture.componentRef.setInput('budget', buildBudget(500, 500, 'exceeded'));
    fixture.detectChanges();

    expect(component.pct()).toBe(100);
    expect(component.barColor()).toBe('#E57373');
  });

  // sc5: límite inferior de rojo exactamente al 80% → rojo
  it('barColor_shouldBeRed_whenPctIsExactly80', () => {
    fixture.componentRef.setInput('budget', buildBudget(400, 500, 'warning'));
    fixture.detectChanges();

    expect(component.pct()).toBe(80);
    expect(component.barColor()).toBe('#E57373');
  });

  // sc6: budgetAmount = 0 → pct = 0, sin división por cero
  it('pct_shouldBe0_whenBudgetAmountIsZero', () => {
    fixture.componentRef.setInput('budget', buildBudget(0, 0, 'ok'));
    fixture.detectChanges();

    expect(component.pct()).toBe(0);
  });
});
