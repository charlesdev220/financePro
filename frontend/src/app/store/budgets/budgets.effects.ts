import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { concatMap, switchMap, map, catchError, withLatestFrom } from 'rxjs/operators';
import { of, EMPTY, merge } from 'rxjs';
import { BudgetsActions } from './budgets.actions';
import { selectAllBudgets, selectBudgetsRowMap } from './budgets.selectors';
import { selectAllTransactions } from '@store/transactions/transactions.selectors';
import { BudgetService, calculateStatus } from '@features/budgets/services/budget.service';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

export const loadBudgets$ = createEffect(
  (
    actions$ = inject(Actions),
    budgetService = inject(BudgetService),
  ) =>
    actions$.pipe(
      ofType(BudgetsActions.loadBudgets),
      switchMap(() =>
        budgetService.loadBudgets().pipe(
          map(({ budgets, rowMap }) =>
            BudgetsActions.loadBudgetsSuccess({ budgets, rowMap }),
          ),
          catchError(error =>
            of(BudgetsActions.loadBudgetsFailure({ error: String(error) })),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const saveBudget$ = createEffect(
  (
    actions$ = inject(Actions),
    budgetService = inject(BudgetService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(BudgetsActions.saveBudget),
      withLatestFrom(store.select(selectAllBudgets)),
      concatMap(([{ budget }, prevItems]) =>
        merge(
          of(BudgetsActions.saveBudgetSuccess({ budget })),
          budgetService.saveBudget(budget).pipe(
            switchMap(() => EMPTY),
            catchError(error =>
              of(BudgetsActions.saveBudgetFailure({ error: String(error), prevItems })),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const updateBudget$ = createEffect(
  (
    actions$ = inject(Actions),
    budgetService = inject(BudgetService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(BudgetsActions.updateBudget),
      withLatestFrom(store.select(selectAllBudgets)),
      concatMap(([{ budget, rowNumber }, prevItems]) =>
        merge(
          of(BudgetsActions.updateBudgetSuccess({ budget })),
          budgetService.updateBudget(budget, rowNumber).pipe(
            switchMap(() => EMPTY),
            catchError(error =>
              of(BudgetsActions.updateBudgetFailure({ error: String(error), prevItems })),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const deleteBudget$ = createEffect(
  (
    actions$ = inject(Actions),
    budgetService = inject(BudgetService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(BudgetsActions.deleteBudget),
      withLatestFrom(store.select(selectAllBudgets)),
      concatMap(([{ budgetId, rowNumber }, prevItems]) =>
        merge(
          of(BudgetsActions.deleteBudgetSuccess({ budgetId })),
          budgetService.deleteBudget(rowNumber).pipe(
            switchMap(() => EMPTY),
            catchError(error =>
              of(BudgetsActions.deleteBudgetFailure({ error: String(error), prevItems })),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const recalculateBudget$ = createEffect(
  (
    actions$ = inject(Actions),
    budgetService = inject(BudgetService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(BudgetsActions.recalculateBudget),
      withLatestFrom(
        store.select(selectAllTransactions),
        store.select(selectAllBudgets),
        store.select(selectBudgetsRowMap),
      ),
      concatMap(([{ categoryId, period }, allTransactions, allBudgets, rowMap]) => {
        const budget = allBudgets.find(
          b => b.categoryId === categoryId && b.period === period,
        );
        if (!budget) return EMPTY;

        const rowNumber = rowMap[budget.budgetId];
        if (!rowNumber) return EMPTY;

        const spentAmount = allTransactions
          .filter(
            t =>
              t.type === TRANSACTION_TYPES.EXPENSE &&
              t.categoryId === categoryId &&
              t.date.startsWith(period),
          )
          .reduce((sum, t) => sum + t.amountBase, 0);

        const status = calculateStatus(spentAmount, budget.budgetAmount);
        const updatedBudget = {
          ...budget,
          spentAmount,
          status,
          lastUpdated: new Date().toISOString(),
        };

        return merge(
          of(BudgetsActions.recalculateBudgetSuccess({ budget: updatedBudget })),
          budgetService.updateBudget(updatedBudget, rowNumber).pipe(
            switchMap(() => EMPTY),
            catchError(error =>
              of(BudgetsActions.recalculateBudgetFailure({ error: String(error) })),
            ),
          ),
        );
      }),
    ),
  { functional: true },
);
