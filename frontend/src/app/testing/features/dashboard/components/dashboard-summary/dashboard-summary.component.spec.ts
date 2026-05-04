import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { DashboardSummaryComponent } from '@features/dashboard/components/dashboard-summary/dashboard-summary.component';
import { DashboardSummary } from '@features/dashboard/services/dashboard.service';

describe('DashboardSummaryComponent', () => {
  let spectator: Spectator<DashboardSummaryComponent>;

  const createComponent = createComponentFactory({
    component: DashboardSummaryComponent,
  });

  function buildSummary(balance: number): DashboardSummary {
    const income = balance >= 0 ? 2000 : 1000;
    const expenses = income - balance;
    return { totalIncome: income, totalExpenses: expenses, balance };
  }

  beforeEach(() => {
    spectator = createComponent({
      props: {
        summary: { totalIncome: 0, totalExpenses: 0, balance: 0 }
      }
    });
  });

  it('balanceIsNegative_shouldReturnFalse_whenBalanceIsPositive', () => {
    spectator.setInput('summary', buildSummary(1500));
    expect(spectator.component.balanceIsNegative()).toBe(false);
  });

  it('balanceIsNegative_shouldReturnFalse_whenBalanceIsZero', () => {
    spectator.setInput('summary', buildSummary(0));
    expect(spectator.component.balanceIsNegative()).toBe(false);
  });

  it('balanceIsNegative_shouldReturnTrue_whenBalanceIsNegative', () => {
    spectator.setInput('summary', buildSummary(-300));
    expect(spectator.component.balanceIsNegative()).toBe(true);
  });

  it('balanceIsNegative_shouldReturnTrue_whenBalanceIsSlightlyBelowZero', () => {
    spectator.setInput('summary', buildSummary(-0.01));
    expect(spectator.component.balanceIsNegative()).toBe(true);
  });
});
