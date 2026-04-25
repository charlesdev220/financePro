import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { concatMap, switchMap, map, catchError, tap, withLatestFrom, from, first, toArray } from 'rxjs';
import { of, EMPTY, merge } from 'rxjs';
import { TransactionsActions } from './transactions.actions';
import { selectAllTransactions, selectTransactionsRowMap } from './transactions.selectors';
import { TransactionService } from '@features/transactions/services/transaction.service';
import { ConceptsService } from '@features/transactions/services/concepts.service';
import { CurrencyApiService } from '@core/services/currency-api.service';
import { BudgetsActions } from '@store/budgets/budgets.actions';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

export const loadTransactions$ = createEffect(
  (
    actions$ = inject(Actions),
    transactionService = inject(TransactionService),
  ) =>
    actions$.pipe(
      ofType(TransactionsActions.loadTransactions),
      switchMap(() =>
        transactionService.loadTransactions().pipe(
          concatMap(({ transactions, rowMap }) => {
            const newRecurring = transactionService.processRecurring(transactions);
            if (newRecurring.length === 0) {
              return of(TransactionsActions.loadTransactionsSuccess({ transactions, rowMap }));
            }
            return from(newRecurring).pipe(
              concatMap(tx => transactionService.saveTransaction(tx)),
              toArray(),
              map(() =>
                TransactionsActions.loadTransactionsSuccess({
                  transactions: [...transactions, ...newRecurring],
                  rowMap,
                }),
              ),
              catchError(error =>
                of(TransactionsActions.loadTransactionsFailure({ error: String(error) })),
              ),
            );
          }),
          catchError(error =>
            of(TransactionsActions.loadTransactionsFailure({ error: String(error) })),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const addTransaction$ = createEffect(
  (
    actions$ = inject(Actions),
    transactionService = inject(TransactionService),
    conceptsService = inject(ConceptsService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(TransactionsActions.addTransaction),
      withLatestFrom(store.select(selectAllTransactions)),
      concatMap(([{ draft, userBaseCurrency }, prevItems]) => {
        const txId = crypto.randomUUID();
        return from(
          transactionService.createTransaction(draft, txId, userBaseCurrency),
        ).pipe(
          concatMap(transaction =>
            merge(
              of(TransactionsActions.addTransactionSuccess({ transaction })),
              transactionService.saveTransaction(transaction).pipe(
                tap(() => {
                  conceptsService.upsertConcept(transaction).catch(err =>
                    console.warn('[addTransaction$] Concept upsert failed:', err),
                  );
                }),
                concatMap(() =>
                  transaction.type === TRANSACTION_TYPES.EXPENSE
                    ? of(BudgetsActions.recalculateBudget({
                        categoryId: transaction.categoryId,
                        period: transaction.date.slice(0, 7),
                      }))
                    : EMPTY,
                ),
                catchError(error =>
                  of(TransactionsActions.addTransactionFailure({ error: String(error), prevItems })),
                ),
              ),
            ),
          ),
        );
      }),
    ),
  { functional: true },
);

export const updateTransaction$ = createEffect(
  (
    actions$ = inject(Actions),
    transactionService = inject(TransactionService),
    currencyApi = inject(CurrencyApiService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(TransactionsActions.updateTransaction),
      withLatestFrom(store.select(selectAllTransactions)),
      concatMap(([{ transaction, rowNumber, userBaseCurrency }, prevItems]) =>
        currencyApi.getRate(transaction.currency, userBaseCurrency).pipe(
          first(),
          map(rate => ({
            ...transaction,
            amountBase: transaction.amount * rate,
            updatedAt: new Date().toISOString(),
          })),
          concatMap(updated =>
            merge(
              of(TransactionsActions.updateTransactionSuccess({ transaction: updated })),
              transactionService.updateTransaction(updated, rowNumber).pipe(
                concatMap(() =>
                  updated.type === TRANSACTION_TYPES.EXPENSE
                    ? of(BudgetsActions.recalculateBudget({
                        categoryId: updated.categoryId,
                        period: updated.date.slice(0, 7),
                      }))
                    : EMPTY,
                ),
                catchError(error =>
                  of(TransactionsActions.updateTransactionFailure({ error: String(error), prevItems })),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const deleteTransaction$ = createEffect(
  (
    actions$ = inject(Actions),
    transactionService = inject(TransactionService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(TransactionsActions.deleteTransaction),
      withLatestFrom(store.select(selectAllTransactions)),
      concatMap(([{ txId, rowNumber }, prevItems]) => {
        const deletedTx = prevItems.find(t => t.txId === txId);
        return merge(
          of(TransactionsActions.deleteTransactionSuccess({ txId })),
          transactionService.deleteTransaction(rowNumber).pipe(
            concatMap(() =>
              deletedTx?.type === TRANSACTION_TYPES.EXPENSE
                ? of(BudgetsActions.recalculateBudget({
                    categoryId: deletedTx.categoryId,
                    period: deletedTx.date.slice(0, 7),
                  }))
                : EMPTY,
            ),
            catchError(error =>
              of(TransactionsActions.deleteTransactionFailure({ error: String(error), prevItems })),
            ),
          ),
        );
      }),
    ),
  { functional: true },
);
