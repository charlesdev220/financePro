import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import { of } from 'rxjs';
import { Action } from '@ngrx/store';
import { BudgetsEffects } from '../../../store/budgets/budgets.effects';
import { BudgetsActions } from '../../../store/budgets/budgets.actions';
import { BudgetService } from '../../../features/budgets/services/budget.service';
import { IBudget } from '../../../models/budget.model';
import { ITransaction } from '../../../models/transaction.model';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function makeBudget(
  categoryId: string,
  period: string,
  budgetAmount: number,
  spentAmount: number,
  status: IBudget['status'] = 'ok',
): IBudget {
  return {
    budgetId: `b-${categoryId}`,
    userId: 'usr_001',
    categoryId,
    period,
    budgetAmount,
    spentAmount,
    status,
    lastUpdated: '2026-04-12T00:00:00Z',
  };
}

function makeExpenseTx(txId: string, categoryId: string, date: string, amountBase: number): ITransaction {
  return {
    txId,
    userId: 'usr_001',
    walletId: 'w1',
    categoryId,
    amount: amountBase,
    currency: 'EUR',
    amountBase,
    concept: 'test',
    date,
    type: 'expense',
    isRecurring: false,
    recurrenceRule: null,
    notes: null,
    createdAt: `${date}T00:00:00Z`,
    updatedAt: `${date}T00:00:00Z`,
  };
}

const INITIAL_STATE = {
  transactions: { items: [], rowMap: {}, loading: false, error: null },
  wallets:      { items: [], rowMap: {}, loading: false, error: null },
  categories:   { items: [], rowMap: {}, loading: false, error: null },
  budgets:      { items: [], rowMap: {}, loading: false, error: null },
  currency:     { rates: {}, loading: false, error: null },
};

// ─────────────────────────────────────────────────────────────────────────────
// BudgetsEffects — REQ-09 sc3 + REQ-10
// ─────────────────────────────────────────────────────────────────────────────
describe('BudgetsEffects (REQ-09 sc3 + REQ-10)', () => {
  let actions$: Subject<Action>;
  let effects: BudgetsEffects;
  let store: MockStore;
  let budgetServiceSpy: jasmine.SpyObj<BudgetService>;

  beforeEach(() => {
    actions$ = new Subject<Action>();

    budgetServiceSpy = jasmine.createSpyObj('BudgetService', [
      'loadBudgets', 'saveBudget', 'updateBudget', 'deleteBudget',
    ]);
    budgetServiceSpy.loadBudgets.and.returnValue(of({ budgets: [], rowMap: {} }));

    TestBed.configureTestingModule({
      providers: [
        BudgetsEffects,
        provideMockActions(() => actions$.asObservable()),
        provideMockStore({ initialState: INITIAL_STATE }),
        { provide: BudgetService, useValue: budgetServiceSpy },
      ],
    });

    effects = TestBed.inject(BudgetsEffects);
    store = TestBed.inject<MockStore>(Store as any);
  });

  afterEach(() => {
    actions$.complete();
    store.resetSelectors();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // recalculateBudget$ — REQ-09 sc3
  // ─────────────────────────────────────────────────────────────────────────

  // REQ-09 sc3: no existe presupuesto para esa categoría/período → EMPTY (no-op)
  it('recalculateBudget_shouldBeNoOp_whenNoBudgetExistsForCategoryAndPeriod', () => {
    // Given: store sin presupuestos para cat-999
    store.setState(INITIAL_STATE);
    budgetServiceSpy.updateBudget.and.returnValue(of(null));
    const dispatchSpy = spyOn(store, 'dispatch').and.callThrough();

    effects.recalculateBudget$.subscribe();

    // When
    actions$.next(BudgetsActions.recalculateBudget({ categoryId: 'cat-999', period: '2026-04' }));

    // Then: EMPTY → no llama a updateBudget ni dispatch recalculateBudgetSuccess
    expect(budgetServiceSpy.updateBudget).not.toHaveBeenCalled();
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      jasmine.objectContaining({ type: BudgetsActions.recalculateBudgetSuccess.type }),
    );
  });

  // REQ-10: recalculateBudget$ calcula spentAmount correctamente (solo expenses del período)
  it('recalculateBudget_shouldCalculateSpentAmountAndDispatchSuccess_whenBudgetExists', () => {
    // Given: presupuesto de 500 EUR para cat-food en 2026-04
    const budget = makeBudget('cat-food', '2026-04', 500, 0, 'ok');
    // Dos expenses de la misma categoría: 150 + 80 = 230
    const tx1 = makeExpenseTx('tx1', 'cat-food', '2026-04-10', 150);
    const tx2 = makeExpenseTx('tx2', 'cat-food', '2026-04-15', 80);
    // Income del mismo período no debe sumarse
    const incomeTx: ITransaction = { ...tx1, txId: 'tx3', type: 'income', amountBase: 999 };

    store.setState({
      ...INITIAL_STATE,
      transactions: { items: [tx1, tx2, incomeTx], rowMap: {}, loading: false, error: null },
      budgets: {
        items: [budget],
        rowMap: { [budget.budgetId]: 2 },
        loading: false,
        error: null,
      },
    });
    budgetServiceSpy.updateBudget.and.returnValue(of(null));
    const dispatchSpy = spyOn(store, 'dispatch').and.callThrough();

    effects.recalculateBudget$.subscribe();

    // When
    actions$.next(BudgetsActions.recalculateBudget({ categoryId: 'cat-food', period: '2026-04' }));

    // Then: spentAmount = 230, status = 'ok' (230/500 = 46%)
    expect(dispatchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: BudgetsActions.recalculateBudgetSuccess.type,
        budget: jasmine.objectContaining({ spentAmount: 230, status: 'ok', budgetAmount: 500 }),
      }),
    );
    expect(budgetServiceSpy.updateBudget).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ spentAmount: 230, status: 'ok' }),
      2,
    );
  });

  // REQ-10: status 'warning' cuando spent ≥ 80%
  it('recalculateBudget_shouldSetStatusWarning_whenSpentIsAbove80Percent', () => {
    // Given: 420/500 = 84% → warning
    const budget = makeBudget('cat-food', '2026-04', 500, 0, 'ok');
    const tx = makeExpenseTx('tx1', 'cat-food', '2026-04-10', 420);

    store.setState({
      ...INITIAL_STATE,
      transactions: { items: [tx], rowMap: {}, loading: false, error: null },
      budgets: { items: [budget], rowMap: { [budget.budgetId]: 2 }, loading: false, error: null },
    });
    budgetServiceSpy.updateBudget.and.returnValue(of(null));
    const dispatchSpy = spyOn(store, 'dispatch').and.callThrough();

    effects.recalculateBudget$.subscribe();
    actions$.next(BudgetsActions.recalculateBudget({ categoryId: 'cat-food', period: '2026-04' }));

    expect(dispatchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        budget: jasmine.objectContaining({ spentAmount: 420, status: 'warning' }),
      }),
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // saveBudget$ — REQ-10: dispatch optimista
  // ─────────────────────────────────────────────────────────────────────────

  // REQ-10: saveBudget$ dispatch optimista saveBudgetSuccess antes de confirmar Sheets
  it('saveBudget_shouldDispatchSaveBudgetSuccess_optimistically', () => {
    // Given
    const budget = makeBudget('cat-food', '2026-04', 500, 0, 'ok');
    budgetServiceSpy.saveBudget.and.returnValue(of(null));
    const dispatchSpy = spyOn(store, 'dispatch').and.callThrough();

    effects.saveBudget$.subscribe();

    // When
    actions$.next(BudgetsActions.saveBudget({ budget }));

    // Then: dispatch optimista antes de que Sheets confirme
    expect(dispatchSpy).toHaveBeenCalledWith(BudgetsActions.saveBudgetSuccess({ budget }));
    expect(budgetServiceSpy.saveBudget).toHaveBeenCalledOnceWith(budget);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // deleteBudget$ — REQ-10: dispatch optimista
  // ─────────────────────────────────────────────────────────────────────────

  // REQ-10: deleteBudget$ dispatch optimista deleteBudgetSuccess
  it('deleteBudget_shouldDispatchDeleteBudgetSuccess_optimistically', () => {
    // Given
    const budget = makeBudget('cat-food', '2026-04', 500, 0, 'ok');
    store.setState({
      ...INITIAL_STATE,
      budgets: { items: [budget], rowMap: {}, loading: false, error: null },
    });
    budgetServiceSpy.deleteBudget.and.returnValue(of(null));
    const dispatchSpy = spyOn(store, 'dispatch').and.callThrough();

    effects.deleteBudget$.subscribe();

    // When
    actions$.next(BudgetsActions.deleteBudget({ budgetId: budget.budgetId, rowNumber: 2 }));

    // Then
    expect(dispatchSpy).toHaveBeenCalledWith(
      BudgetsActions.deleteBudgetSuccess({ budgetId: budget.budgetId }),
    );
    expect(budgetServiceSpy.deleteBudget).toHaveBeenCalledOnceWith(2);
  });
});
