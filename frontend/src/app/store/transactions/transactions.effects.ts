import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { concatMap, switchMap, map, catchError, tap, withLatestFrom, from, first } from 'rxjs';
import { of, EMPTY } from 'rxjs';
import { TransactionsActions } from './transactions.actions';
import { selectAllTransactions, selectTransactionsRowMap } from './transactions.selectors';
import { TransactionService } from '../../features/transactions/services/transaction.service';
import { ConceptsService } from '../../features/transactions/services/concepts.service';
import { CurrencyApiService } from '../../core/services/currency-api.service';

@Injectable()
export class TransactionsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly transactionService = inject(TransactionService);
  private readonly conceptsService = inject(ConceptsService);
  private readonly currencyApi = inject(CurrencyApiService);

  loadTransactions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TransactionsActions.loadTransactions),
      switchMap(() =>
        this.transactionService.loadTransactions().pipe(
          map(({ transactions, rowMap }) => {
            // Procesar recurrentes vencidas y generar nuevas
            const newRecurring = this.transactionService.processRecurring(transactions);
            newRecurring.forEach(tx => {
              this.transactionService.saveTransaction(tx).subscribe();
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
  );

  addTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TransactionsActions.addTransaction),
      withLatestFrom(this.store.select(selectAllTransactions)),
      concatMap(([{ draft, userBaseCurrency }, prevItems]) => {
        const txId = crypto.randomUUID();
        return from(
          this.transactionService.createTransaction(draft, txId, userBaseCurrency),
        ).pipe(
          tap(transaction => {
            // Actualización optimista: añadir al store ANTES de confirmar en Sheets
            this.store.dispatch(
              TransactionsActions.addTransactionSuccess({ transaction }),
            );
          }),
          concatMap(transaction =>
            this.transactionService.saveTransaction(transaction).pipe(
              tap(() => {
                // Upsert de concepto solo tras éxito confirmado (ADR-03)
                this.conceptsService.upsertConcept(transaction).catch(err =>
                  console.warn('[TransactionsEffects] Concept upsert failed:', err),
                );
              }),
              catchError(error => {
                this.store.dispatch(
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
    { dispatch: false },
  );

  updateTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TransactionsActions.updateTransaction),
      withLatestFrom(this.store.select(selectAllTransactions)),
      concatMap(([{ transaction, rowNumber, userBaseCurrency }, prevItems]) =>
        // REQ-05: recalcular amountBase con tasa vigente (in-memory cache → sin llamada extra si está fresca)
        this.currencyApi.getRate(transaction.currency, userBaseCurrency).pipe(
          first(),
          map(rate => ({
            ...transaction,
            amountBase: transaction.amount * rate,
            updatedAt: new Date().toISOString(),
          })),
          tap(updated =>
            this.store.dispatch(TransactionsActions.updateTransactionSuccess({ transaction: updated })),
          ),
          concatMap(updated =>
            this.transactionService.updateTransaction(updated, rowNumber).pipe(
              catchError(error => {
                this.store.dispatch(
                  TransactionsActions.updateTransactionFailure({ error: String(error), prevItems }),
                );
                return EMPTY;
              }),
            ),
          ),
        ),
      ),
    ),
    { dispatch: false },
  );

  deleteTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TransactionsActions.deleteTransaction),
      withLatestFrom(this.store.select(selectAllTransactions)),
      concatMap(([{ txId, rowNumber }, prevItems]) => {
        // Actualización optimista
        this.store.dispatch(
          TransactionsActions.deleteTransactionSuccess({ txId }),
        );
        return this.transactionService.deleteTransaction(rowNumber).pipe(
          catchError(error => {
            this.store.dispatch(
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
    { dispatch: false },
  );
}
