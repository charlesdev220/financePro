import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { DashboardChartComponent } from '../../../../../features/dashboard/components/dashboard-chart/dashboard-chart.component';
import { CategoryBreakdown } from '../../../../../features/dashboard/services/dashboard.service';
import { IBudget } from '../../../../../models/budget.model';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
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
    budgetId:     'bgt-1',
    userId:       'usr_001',
    categoryId:   'cat-1',
    period:       '2026-04',
    spentAmount:  120,
    budgetAmount: 200,
    status:       'ok',
    lastUpdated:  '2026-04-27T00:00:00Z',
    workspaceId:  'ws_test',
    mode:         'indefinite',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardChartComponent — expenseItems computed
// ─────────────────────────────────────────────────────────────────────────────
describe('DashboardChartComponent — expenseItems', () => {

  // REQ-02 sc1: categoría con presupuesto → showBudgetLabel = true
  it('expenseItems_shouldHaveShowBudgetLabelTrue_whenCategoryHasBudget', () => {
    // Given
    TestBed.configureTestingModule({ imports: [DashboardChartComponent] });
    const fixture = TestBed.createComponent(DashboardChartComponent);
    const comp    = fixture.componentInstance;

    const breakdown = [makeBreakdown()];
    const budgets   = [makeBudget({ categoryId: 'cat-1', spentAmount: 120, budgetAmount: 200 })];

    fixture.componentRef.setInput('breakdown', breakdown);
    fixture.componentRef.setInput('balance', 500);
    fixture.componentRef.setInput('currency', 'EUR');
    fixture.componentRef.setInput('budgets', budgets);
    fixture.detectChanges();

    // When
    const items = comp.expenseItems();

    // Then
    expect(items.length).toBe(1);
    expect(items[0].budgetMeta.showBudgetLabel).toBe(true);
    expect(items[0].budgetMeta.hasBudget).toBe(true);
  });

  // REQ-02 sc2: categoría sin presupuesto → showBudgetLabel = false
  it('expenseItems_shouldHaveShowBudgetLabelFalse_whenCategoryHasNoBudget', () => {
    // Given
    TestBed.configureTestingModule({ imports: [DashboardChartComponent] });
    const fixture = TestBed.createComponent(DashboardChartComponent);
    const comp    = fixture.componentInstance;

    const breakdown = [makeBreakdown({ categoryId: 'cat-2' })];

    fixture.componentRef.setInput('breakdown', breakdown);
    fixture.componentRef.setInput('balance', 500);
    fixture.componentRef.setInput('currency', 'EUR');
    fixture.componentRef.setInput('budgets', []);
    fixture.detectChanges();

    // When
    const items = comp.expenseItems();

    // Then
    expect(items.length).toBe(1);
    expect(items[0].budgetMeta.showBudgetLabel).toBe(false);
    expect(items[0].budgetMeta.hasBudget).toBe(false);
  });

  // REQ-02 sc3: pct de pila con presupuesto = spentAmount/budgetAmount
  it('expenseItems_pilaPercent_shouldBeSpentOverBudget_whenHasBudget', () => {
    // Given: 120 gastado de 200 = 60%
    TestBed.configureTestingModule({ imports: [DashboardChartComponent] });
    const fixture = TestBed.createComponent(DashboardChartComponent);
    const comp    = fixture.componentInstance;

    fixture.componentRef.setInput('breakdown', [makeBreakdown({ amount: 200 })]);
    fixture.componentRef.setInput('balance', 0);
    fixture.componentRef.setInput('currency', 'EUR');
    fixture.componentRef.setInput('budgets', [makeBudget({ spentAmount: 120, budgetAmount: 200 })]);
    fixture.detectChanges();

    // When
    const pct = comp.expenseItems()[0].budgetMeta.pct;

    // Then
    expect(pct).toBe(60);
  });
});
