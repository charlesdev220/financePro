import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardSummaryComponent } from '../../../../../features/dashboard/components/dashboard-summary/dashboard-summary.component';
import { DashboardSummary } from '../../../../../features/dashboard/services/dashboard.service';

// ─────────────────────────────────────────────────────────────────────────────
// DashboardSummaryComponent — computed balanceIsNegative (REQ-04)
// ─────────────────────────────────────────────────────────────────────────────
describe('DashboardSummaryComponent', () => {
  let component: DashboardSummaryComponent;
  let fixture: ComponentFixture<DashboardSummaryComponent>;

  function buildSummary(balance: number): DashboardSummary {
    const income = balance >= 0 ? 2000 : 1000;
    const expenses = income - balance;
    return { totalIncome: income, totalExpenses: expenses, balance };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardSummaryComponent);
    component = fixture.componentInstance;
  });

  // REQ-04 sc1: balance positivo → balanceIsNegative = false → color normal
  it('balanceIsNegative_shouldReturnFalse_whenBalanceIsPositive', () => {
    // Given: el usuario tiene más ingresos que gastos en el período
    fixture.componentRef.setInput('summary', buildSummary(1500));
    fixture.detectChanges();

    // When / Then
    expect(component.balanceIsNegative()).toBe(false);
  });

  // REQ-04 sc1 (edge): balance exactamente 0 → no es negativo
  it('balanceIsNegative_shouldReturnFalse_whenBalanceIsZero', () => {
    // Given: ingresos == gastos
    fixture.componentRef.setInput('summary', buildSummary(0));
    fixture.detectChanges();

    // When / Then
    expect(component.balanceIsNegative()).toBe(false);
  });

  // REQ-04 sc2: balance negativo → balanceIsNegative = true → color alerta (warning)
  it('balanceIsNegative_shouldReturnTrue_whenBalanceIsNegative', () => {
    // Given: más gastos que ingresos en el período
    fixture.componentRef.setInput('summary', buildSummary(-300));
    fixture.detectChanges();

    // When / Then
    expect(component.balanceIsNegative()).toBe(true);
  });

  // REQ-04 sc2 (edge): -0.01 → todavía negativo
  it('balanceIsNegative_shouldReturnTrue_whenBalanceIsSlightlyBelowZero', () => {
    // Given
    fixture.componentRef.setInput('summary', buildSummary(-0.01));
    fixture.detectChanges();

    // When / Then
    expect(component.balanceIsNegative()).toBe(true);
  });
});
