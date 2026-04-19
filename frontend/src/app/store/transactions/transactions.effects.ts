import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { concatMap, switchMap, map, catchError, tap, withLatestFrom, from, first } from 'rxjs';
import { of, EMPTY } from 'rxjs';
import { TransactionsActions } from './transactions.actions';
import { selectAllTransactions, selectTransactionsRowMap } from './transactions.selectors';
import { TransactionService } from '../../features/transactions/services/transaction.service';
import { ConceptsService } from '../../features/transactions/services/concepts.service';
import { CurrencyApiService } from '../../core/services/currency-api.service';
import { BudgetsActions } from '../budgets/budgets.actions';
import { TRANSACTION_TYPES } from '../../core/constants/transaction.constants';

export const loadTransactions$ = createEffect(
  (
    actions$ = inject(Actions),
    transactionService = inject(TransactionService),
  ) =>
    actions$.pipe(
      ofType(TransactionsActions.loadTransactions),
      switchMap(() =>
        transactionService.loadTransactions().pipe(
          map(({ transactions, rowMap }) => {
            const newRecurring = transactionService.processRecurring(transactions);
            newRecurring.forEach(tx => {
              transactionService.saveTransaction(tx).subscribe();
            });
            return TransactionsActions.loadTransactionsSuccess({
              transactions: [...transactions, ...newRecurring],
              rowMap,
            });
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
          tap(transaction => {
            store.dispatch(TransactionsActions.addTransactionSuccess({ transaction }));
          }),
          concatMap(transaction =>
            transactionService.saveTransaction(transaction).pipe(
              tap(() => {
                conceptsService.upsertConcept(transaction).catch(err =>
                  console.warn('[addTransaction$] Concept upsert failed:', err),
                );
                if (transaction.type === TRANSACTION_TYPES.EXPENSE) {
                  store.dispatch(
                    BudgetsActions.recalculateBudget({
                      categoryId: transaction.categoryId,
                      period: transaction.date.slice(0, 7),
                    }),
                  );
                }
              }),
              catchError(error => {
                store.dispatch(
                  TransactionsActions.addTransactionFailure({
                    error: String(error),
                    prevItems,
                  }),
                );
                return EMPTY;
              }),
            ),
          ),
        );
      }),
    ),
  { functional: true, dispatch: false },
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
          tap(updated =>
            store.dispatch(TransactionsActions.updateTransactionSuccess({ transaction: updated })),
          ),
          concatMap(updated =>
            transactionService.updateTransaction(updated, rowNumber).pipe(
              tap(() => {
                if (updated.type === TRANSACTION_TYPES.EXPENSE) {
                  store.dispatch(
                    BudgetsActions.recalculateBudget({
                      categoryId: updated.categoryId,
                      period: updated.date.slice(0, 7),
                    }),
                  );
                }
              }),
              catchError(error => {
                store.dispatch(
                  TransactionsActions.updateTransactionFailure({ error: String(error), prevItems }),
                );
                return EMPTY;
              }),
            ),
          ),
        ),
      ),
    ),
  { functional: true, dispatch: false },
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
        store.dispatch(TransactionsActions.deleteTransactionSuccess({ txId }));
        return transactionService.deleteTransaction(rowNumber).pipe(
          tap(() => {
            const deletedTx = prevItems.find(t => t.txId === txId);
            if (deletedTx?.type === TRANSACTION_TYPES.EXPENSE) {
              store.dispatch(
                BudgetsActions.recalculateBudget({
                  categoryId: deletedTx.categoryId,
                  period: deletedTx.date.slice(0, 7),
                }),
              );
            }
          }),
          catchError(error => {
            store.dispatch(
              TransactionsActions.deleteTransactionFailure({
                error: String(error),
                prevItems,
              }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
  { functional: true, dispatch: false },
);
