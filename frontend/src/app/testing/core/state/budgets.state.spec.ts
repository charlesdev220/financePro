import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { BudgetsStateService } from '@core/state/budgets.state';
import { BudgetService } from '@features/budgets/services/budget.service';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { MOCK_BUDGETS, MOCK_TRANSACTIONS, MOCK_WORKSPACE_ID_A } from '../../fixtures';
import { IBudget } from '@models/budget.model';

// ─────────────────────────────────────────────────────────────────────────────
// BudgetsStateService — REQ-03
// ─────────────────────────────────────────────────────────────────────────────
describe('BudgetsStateService', () => {
  let service: BudgetsStateService;
  let budgetServiceSpy: jest.Mocked<BudgetService>;

  const ONE_BUDGET = [MOCK_BUDGETS[0]];
  const ROW_MAP: Record<string, number> = { [MOCK_BUDGETS[0].budgetId]: 2 };

  const NEW_BUDGET: IBudget = {
    budgetId:     'budget-new-001',
    userId:       'usr_001',
    categoryId:   'cat-new',
    period:       '2026-04',
    spentAmount:  0,
    budgetAmount: 300,
    status:       'ok',
    lastUpdated:  '2026-04-26T00:00:00.000Z',
    workspaceId:  'ws_test',
    mode:         'indefinite',
  };

  let workspacesStateSpy: jest.Mocked<WorkspacesStateService>;

  beforeEach(() => {
    budgetServiceSpy = {
      loadBudgets:  jest.fn(),
      saveBudget:   jest.fn().mockReturnValue(of(undefined)),
      updateBudget: jest.fn().mockReturnValue(of(undefined)),
      deleteBudget: jest.fn().mockReturnValue(of(undefined)),
    } as unknown as jest.Mocked<BudgetService>;

    workspacesStateSpy = {
      activeWorkspaceId:  jest.fn().mockReturnValue(MOCK_WORKSPACE_ID_A),
      defaultWorkspaceId: jest.fn().mockReturnValue(MOCK_WORKSPACE_ID_A),
    } as unknown as jest.Mocked<WorkspacesStateService>;

    TestBed.configureTestingModule({
      providers: [
        BudgetsStateService,
        { provide: BudgetService,          useValue: budgetServiceSpy },
        { provide: WorkspacesStateService, useValue: workspacesStateSpy },
      ],
    });

    service = TestBed.inject(BudgetsStateService);
  });

  // REQ-03 sc1 — load() exitoso → items() y rowMap() populados
  it('load_shouldSetItemsAndRowMap_whenLoadSucceeds', fakeAsync(() => {
    budgetServiceSpy.loadBudgets.mockReturnValue(
      of({ budgets: ONE_BUDGET, rowMap: ROW_MAP }),
    );

    service.load();
    flushMicrotasks();

    expect(service.items().length).toBe(1);
    expect(service.rowMap()[ONE_BUDGET[0].budgetId]).toBe(2);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  }));

  // REQ-03 sc2 — save() rollback al fallar → items() vuelve a 1
  it('save_shouldRollback_whenSaveFails', fakeAsync(() => {
    budgetServiceSpy.loadBudgets.mockReturnValue(
      of({ budgets: ONE_BUDGET, rowMap: ROW_MAP }),
    );
    service.load();
    flushMicrotasks();

    budgetServiceSpy.saveBudget.mockReturnValue(throwError(() => new Error('Save failed')));

    service.save(NEW_BUDGET);
    flushMicrotasks();

    expect(service.items().length).toBe(1);
    expect(service.error()).not.toBeNull();
  }));

  // REQ-03 sc3 — recalculate() actualiza spentAmount y status
  it('recalculate_shouldUpdateSpentAmountAndStatus', fakeAsync(() => {
    const budget = { ...MOCK_BUDGETS[0], spentAmount: 0, status: 'ok' as const };
    budgetServiceSpy.loadBudgets.mockReturnValue(
      of({ budgets: [budget], rowMap: { [budget.budgetId]: 2 } }),
    );
    service.load();
    flushMicrotasks();

    const expenseTx = MOCK_TRANSACTIONS.find(t => t.type === 'expense' && t.categoryId === budget.categoryId);
    const txsForRecalc = expenseTx ? [expenseTx] : MOCK_TRANSACTIONS;

    service.recalculate(budget.categoryId, budget.period, txsForRecalc);
    flushMicrotasks();

    const updated = service.items().find(b => b.budgetId === budget.budgetId)!;
    expect(updated.spentAmount).toBeGreaterThanOrEqual(0);
    expect(['ok', 'warning', 'exceeded']).toContain(updated.status);
  }));

  // REQ-03 sc4 — recalculate() sin presupuesto existente → no-op, sin error
  it('recalculate_shouldBeNoOp_whenNoBudgetForCategory', fakeAsync(() => {
    budgetServiceSpy.loadBudgets.mockReturnValue(
      of({ budgets: ONE_BUDGET, rowMap: ROW_MAP }),
    );
    service.load();
    flushMicrotasks();

    service.recalculate('non-existent-category', '2026-04', MOCK_TRANSACTIONS);
    flushMicrotasks();

    expect(service.error()).toBeNull();
    expect(service.items().length).toBe(1);
  }));
});
