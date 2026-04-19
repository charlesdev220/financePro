import { DashboardSummaryComponent } from '../../../../../features/dashboard/components/dashboard-summary/dashboard-summary.component';
import { DashboardSummary } from '../../../../../features/dashboard/services/dashboard.service';

// ─────────────────────────────────────────────────────────────────────────────
// DashboardSummaryComponent — getter balanceIsNegative (REQ-04)
// No usa inject() ni servicios externos → se instancia directamente.
// ─────────────────────────────────────────────────────────────────────────────
describe('DashboardSummaryComponent', () => {
  let component: DashboardSummaryComponent;

  function buildSummary(balance: number): DashboardSummary {
    const income = balance >= 0 ? 2000 : 1000;
    const expenses = income - balance;
    return { totalIncome: income, totalExpenses: expenses, balance };
  }

  beforeEach(() => {
    component = new DashboardSummaryComponent();
  });

  // REQ-04 sc1: balance positivo → balanceIsNegative = false → color normal
  it('balanceIsNegative_shouldReturnFalse_whenBalanceIsPositive', () => {
    // Given: el usuario tiene más ingresos que gastos en el período
    component.summary = buildSummary(1500);

    // When / Then
    expect(component.balanceIsNegative).toBeFalse();
  });

  // REQ-04 sc1 (edge): balance exactamente 0 → no es negativo
  it('balanceIsNegative_shouldReturnFalse_whenBalanceIsZero', () => {
    // Given: ingresos == gastos
    component.summary = buildSummary(0);

    // When / Then
    expect(component.balanceIsNegative).toBeFalse();
  });

  // REQ-04 sc2: balance negativo → balanceIsNegative = true → color alerta (warning)
  it('balanceIsNegative_shouldReturnTrue_whenBalanceIsNegative', () => {
    // Given: más gastos que ingresos en el período
    component.summary = buildSummary(-300);

    // When / Then
    expect(component.balanceIsNegative).toBeTrue();
  });

  // REQ-04 sc2 (edge): -0.01 → todavía negativo
  it('balanceIsNegative_shouldReturnTrue_whenBalanceIsSlightlyBelowZero', () => {
    // Given
    component.summary = buildSummary(-0.01);

    // When / Then
    expect(component.balanceIsNegative).toBeTrue();
  });
});
