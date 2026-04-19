import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetIndicatorComponent } from '../../../../shared/components/budget-indicator/budget-indicator.component';
import { IBudget } from '../../../../models/budget.model';

// ─────────────────────────────────────────────────────────────────────────────
// BudgetIndicatorComponent — computed percentage y color
// ─────────────────────────────────────────────────────────────────────────────
describe('BudgetIndicatorComponent', () => {
  let component: BudgetIndicatorComponent;
  let fixture: ComponentFixture<BudgetIndicatorComponent>;

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
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetIndicatorComponent);
    component = fixture.componentInstance;
  });

  // REQ-12 sc1: status 'ok' → porcentaje correcto y color 'success'
  it('percentage_shouldBe40AndColorSuccess_whenStatusIsOk', () => {
    // Given: 200/500 = 40%
    fixture.componentRef.setInput('budget', buildBudget(200, 500, 'ok'));
    fixture.detectChanges();

    // When / Then
    expect(component.percentage()).toBe(40);
    expect(component.color()).toBe('success');
  });

  // REQ-12 sc2: status 'warning' → color 'warning'
  it('color_shouldBeWarning_whenStatusIsWarning', () => {
    // Given: 430/500 = 86%
    fixture.componentRef.setInput('budget', buildBudget(430, 500, 'warning'));
    fixture.detectChanges();

    // When / Then
    expect(component.color()).toBe('warning');
    expect(component.percentage()).toBe(86);
  });

  // REQ-12 sc3: status 'exceeded' → percentage clamped a 100, color 'danger'
  it('percentage_shouldBeClampedTo100AndColorDanger_whenStatusIsExceeded', () => {
    // Given: 600/500 = 120% → clamp a 100
    fixture.componentRef.setInput('budget', buildBudget(600, 500, 'exceeded'));
    fixture.detectChanges();

    // When / Then
    expect(component.percentage()).toBe(100);
    expect(component.color()).toBe('danger');
  });

  // Edge: presupuesto gastado exactamente al 100% → percentage = 100, color 'danger'
  it('percentage_shouldBe100AndColorDanger_whenSpentEqualsbudget', () => {
    // Given: 500/500 = 100%
    fixture.componentRef.setInput('budget', buildBudget(500, 500, 'exceeded'));
    fixture.detectChanges();

    // When / Then
    expect(component.percentage()).toBe(100);
    expect(component.color()).toBe('danger');
  });

  // Edge: presupuesto exactamente al 80% (límite inferior de warning)
  it('percentage_shouldBe80AndColorWarning_whenSpentIsExactly80Percent', () => {
    // Given: 400/500 = 80%
    fixture.componentRef.setInput('budget', buildBudget(400, 500, 'warning'));
    fixture.detectChanges();

    // When / Then
    expect(component.percentage()).toBe(80);
    expect(component.color()).toBe('warning');
  });
});
