import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { createServiceFactory, SpectatorService, mockProvider } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { BudgetsStateService } from '@core/state/budgets.state';
import { BudgetService } from '@features/budgets/services/budget.service';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { MOCK_BUDGETS, MOCK_TRANSACTIONS, MOCK_WORKSPACE_ID_A } from '../../fixtures';
import { IBudget } from '@models/budget.model';

describe('BudgetsStateService', () => {
  let spectator: SpectatorService<BudgetsStateService>;

  const activeWorkspaceId = signal(MOCK_WORKSPACE_ID_A);
  const defaultWorkspaceId = signal(MOCK_WORKSPACE_ID_A);

  const createService = createServiceFactory({
    service: BudgetsStateService,
    mocks: [BudgetService],
    providers: [
      mockProvider(WorkspacesStateService, {
        activeWorkspaceId,
        defaultWorkspaceId,
      }),
    ],
  });

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
    workspaceId:  MOCK_WORKSPACE_ID_A,
    mode:         'indefinite',
  };

  beforeEach(() => {
    activeWorkspaceId.set(MOCK_WORKSPACE_ID_A);
    defaultWorkspaceId.set(MOCK_WORKSPACE_ID_A);
    spectator = createService();
    spectator.inject(BudgetService).saveBudget.mockReturnValue(of(undefined));
    spectator.inject(BudgetService).updateBudget.mockReturnValue(of(undefined));
    spectator.inject(BudgetService).deleteBudget.mockReturnValue(of(undefined));
  });

  it('load_shouldSetItemsAndRowMap_whenLoadSucceeds', fakeAsync(() => {
    spectator.inject(BudgetService).loadBudgets.mockReturnValue(
      of({ budgets: ONE_BUDGET, rowMap: ROW_MAP }),
    );

    spectator.service.load();
    flushMicrotasks();

    expect(spectator.service.items().length).toBe(1);
    expect(spectator.service.rowMap()[ONE_BUDGET[0].budgetId]).toBe(2);
    expect(spectator.service.loading()).toBe(false);
  }));

  it('load_shouldSetError_whenLoadFails', fakeAsync(() => {
    spectator.inject(BudgetService).loadBudgets.mockReturnValue(throwError(() => 'Load error'));
    spectator.service.load();
    flushMicrotasks();
    expect(spectator.service.error()).toBe('Load error');
  }));

  it('save_shouldRollback_whenSaveFails', fakeAsync(() => {
    spectator.inject(BudgetService).loadBudgets.mockReturnValue(of({ budgets: ONE_BUDGET, rowMap: ROW_MAP }));
    spectator.service.load();
    flushMicrotasks();

    spectator.inject(BudgetService).saveBudget.mockReturnValue(throwError(() => 'Save error'));
    spectator.service.save(NEW_BUDGET);
    flushMicrotasks();

    expect(spectator.service.items().length).toBe(1);
    expect(spectator.service.error()).toBe('Save error');
  }));

  it('update_shouldUpdateStateAndRollbackOnError', fakeAsync(() => {
    spectator.inject(BudgetService).loadBudgets.mockReturnValue(of({ budgets: ONE_BUDGET, rowMap: ROW_MAP }));
    spectator.service.load();
    flushMicrotasks();

    const updated = { ...MOCK_BUDGETS[0], budgetAmount: 999 };
    spectator.inject(BudgetService).updateBudget.mockReturnValue(throwError(() => 'Update error'));

    spectator.service.update(updated, 2);
    expect(spectator.service.items()[0].budgetAmount).toBe(999);

    flushMicrotasks();
    expect(spectator.service.items()[0].budgetAmount).toBe(MOCK_BUDGETS[0].budgetAmount);
    expect(spectator.service.error()).toBe('Update error');
  }));

  it('delete_shouldDeleteFromStateAndRollbackOnError', fakeAsync(() => {
    spectator.inject(BudgetService).loadBudgets.mockReturnValue(of({ budgets: ONE_BUDGET, rowMap: ROW_MAP }));
    spectator.service.load();
    flushMicrotasks();

    spectator.inject(BudgetService).deleteBudget.mockReturnValue(throwError(() => 'Delete error'));

    spectator.service.delete(MOCK_BUDGETS[0].budgetId, 2);
    expect(spectator.service.items()).toHaveLength(0);

    flushMicrotasks();
    expect(spectator.service.items()).toHaveLength(1);
    expect(spectator.service.error()).toBe('Delete error');
  }));

  it('recalculate_shouldUpdateSpentAmountAndStatus', fakeAsync(() => {
    const budget = { ...MOCK_BUDGETS[0], spentAmount: 0, status: 'ok' as const };
    spectator.inject(BudgetService).loadBudgets.mockReturnValue(of({ budgets: [budget], rowMap: { [budget.budgetId]: 2 } }));
    spectator.service.load();
    flushMicrotasks();

    const expenseTx = { ...MOCK_TRANSACTIONS[0], type: 'expense' as const, categoryId: budget.categoryId, amountBase: 100, date: budget.period + '-01' };

    spectator.service.recalculate(budget.categoryId, budget.period, [expenseTx]);
    flushMicrotasks();

    const updated = spectator.service.items().find(b => b.budgetId === budget.budgetId)!;
    expect(updated.spentAmount).toBe(100);
    expect(spectator.inject(BudgetService).updateBudget).toHaveBeenCalled();
  }));

  it('createOrRecalculate_shouldCreateNew_whenDoesNotExist', fakeAsync(() => {
    spectator.inject(BudgetService).loadBudgets.mockReturnValue(of({ budgets: [], rowMap: {} }));
    spectator.service.load();
    flushMicrotasks();

    spectator.service.createOrRecalculate('cat_new', '2026-04', 500, 'u1', []);
    flushMicrotasks();

    expect(spectator.inject(BudgetService).saveBudget).toHaveBeenCalled();
    expect(spectator.service.items()).toHaveLength(1);
    expect(spectator.service.items()[0].budgetAmount).toBe(500);
  }));

  it('createOrRecalculate_shouldUpdateExisting_whenAmountDiffers', fakeAsync(() => {
    const budget = { ...MOCK_BUDGETS[0], spentAmount: 0 };
    spectator.inject(BudgetService).loadBudgets.mockReturnValue(of({ budgets: [budget], rowMap: { [budget.budgetId]: 2 } }));
    spectator.service.load();
    flushMicrotasks();

    const expenseTx = { ...MOCK_TRANSACTIONS[0], type: 'expense' as const, categoryId: budget.categoryId, amountBase: 100, date: budget.period + '-01' };

    spectator.service.createOrRecalculate(budget.categoryId, budget.period, 500, 'u1', [expenseTx]);
    flushMicrotasks();

    expect(spectator.inject(BudgetService).updateBudget).toHaveBeenCalled();
    expect(spectator.service.items()[0].spentAmount).toBe(100);
  }));
});
