import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { concatMap, switchMap, map, catchError, tap, withLatestFrom } from 'rxjs/operators';
import { of, EMPTY } from 'rxjs';
import { BudgetsActions } from './budgets.actions';
import { selectAllBudgets, selectBudgetsRowMap } from './budgets.selectors';
import { selectAllTransactions } from '../transactions/transactions.selectors';
import { BudgetService, calculateStatus } from '../../features/budgets/services/budget.service';

@Injectable()
export class BudgetsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly budgetService = inject(BudgetService);

  loadBudgets$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BudgetsActions.loadBudgets),
      switchMap(() =>
        this.budgetService.loadBudgets().pipe(
          map(({ budgets, rowMap }) =>
            BudgetsActions.loadBudgetsSuccess({ budgets, rowMap }),
          ),
          catchError(error =>
            of(BudgetsActions.loadBudgetsFailure({ error: String(error) })),
          ),
        ),
      ),
    ),
  );

  saveBudget$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BudgetsActions.saveBudget),
      withLatestFrom(this.store.select(selectAllBudgets)),
      concatMap(([{ budget }, prevItems]) => {
        // Optimistic dispatch antes de confirmar en Sheets
        this.store.dispatch(BudgetsActions.saveBudgetSuccess({ budget }));
        return this.budgetService.saveBudget(budget).pipe(
          catchError(error => {
            this.store.dispatch(
              BudgetsActions.saveBudgetFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
    { dispatch: false },
  );

  updateBudget$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BudgetsActions.updateBudget),
      withLatestFrom(this.store.select(selectAllBudgets)),
      concatMap(([{ budget, rowNumber }, prevItems]) => {
        this.store.dispatch(BudgetsActions.updateBudgetSuccess({ budget }));
        return this.budgetService.updateBudget(budget, rowNumber).pipe(
          catchError(error => {
            this.store.dispatch(
              BudgetsActions.updateBudgetFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
    { dispatch: false },
  );

  deleteBudget$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BudgetsActions.deleteBudget),
      withLatestFrom(this.store.select(selectAllBudgets)),
      concatMap(([{ budgetId, rowNumber }, prevItems]) => {
        // Optimistic dispatch
        this.store.dispatch(BudgetsActions.deleteBudgetSuccess({ budgetId }));
        return this.budgetService.deleteBudget(rowNumber).pipe(
          catchError(error => {
            this.store.dispatch(
              BudgetsActions.deleteBudgetFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
    { dispatch: false },
  );

  recalculateBudget$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BudgetsActions.recalculateBudget),
      withLatestFrom(
        this.store.select(selectAllTransactions),
        this.store.select(selectAllBudgets),
        this.store.select(selectBudgetsRowMap),
      ),
      concatMap(([{ categoryId, period }, allTransactions, allBudgets, rowMap]) => {
        const budget = allBudgets.find(
          b => b.categoryId === categoryId && b.period === period,
        );

        // Si no existe presupuesto para esta categoría/período, no hacer nada
        if (!budget) return EMPTY;

        const rowNumber = rowMap[budget.budgetId];
        if (!rowNumber) return EMPTY;

        const spentAmount = allTransactions
          .filter(
            t => t.type === 'expense' && t.categoryId === categoryId && t.date.startsWith(period),
          )
          .reduce((sum, t) => sum + t.amountBase, 0);

        const status = calculateStatus(spentAmount, budget.budgetAmount);
        const updatedBudget = {
          ...budget,
          spentAmount,
          status,
          lastUpdated: new Date().toISOString(),
        };

        // Dispatch optimista del resultado calculado
        this.store.dispatch(BudgetsActions.recalculateBudgetSuccess({ budget: updatedBudget }));

        return this.budgetService.updateBudget(updatedBudget, rowNumber).pipe(
          catchError(error => {
            this.store.dispatch(
              BudgetsActions.recalculateBudgetFailure({ error: String(error) }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
    { dispatch: false },
  );
}
