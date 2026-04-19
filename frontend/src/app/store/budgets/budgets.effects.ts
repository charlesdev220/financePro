import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { concatMap, switchMap, map, catchError, withLatestFrom } from 'rxjs/operators';
import { of, EMPTY } from 'rxjs';
import { BudgetsActions } from './budgets.actions';
import { selectAllBudgets, selectBudgetsRowMap } from './budgets.selectors';
import { selectAllTransactions } from '../transactions/transactions.selectors';
import { BudgetService, calculateStatus } from '../../features/budgets/services/budget.service';
import { TRANSACTION_TYPES } from '../../core/constants/transaction.constants';

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
      concatMap(([{ budget }, prevItems]) => {
        store.dispatch(BudgetsActions.saveBudgetSuccess({ budget }));
        return budgetService.saveBudget(budget).pipe(
          catchError(error => {
            store.dispatch(
              BudgetsActions.saveBudgetFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
  { functional: true, dispatch: false },
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
      concatMap(([{ budget, rowNumber }, prevItems]) => {
        store.dispatch(BudgetsActions.updateBudgetSuccess({ budget }));
        return budgetService.updateBudget(budget, rowNumber).pipe(
          catchError(error => {
            store.dispatch(
              BudgetsActions.updateBudgetFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
  { functional: true, dispatch: false },
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
      concatMap(([{ budgetId, rowNumber }, prevItems]) => {
        store.dispatch(BudgetsActions.deleteBudgetSuccess({ budgetId }));
        return budgetService.deleteBudget(rowNumber).pipe(
          catchError(error => {
            store.dispatch(
              BudgetsActions.deleteBudgetFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
  { functional: true, dispatch: false },
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

        store.dispatch(BudgetsActions.recalculateBudgetSuccess({ budget: updatedBudget }));

        return budgetService.updateBudget(updatedBudget, rowNumber).pipe(
          catchError(error => {
            store.dispatch(
              BudgetsActions.recalculateBudgetFailure({ error: String(error) }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
  { functional: true, dispatch: false },
);
