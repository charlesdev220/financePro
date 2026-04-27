import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, from, concatMap, toArray } from 'rxjs';
import { ITransaction, TransactionDraft } from '@models/transaction.model';
import { TransactionService } from '@features/transactions/services/transaction.service';
import { ConceptsService } from '@features/transactions/services/concepts.service';
import { CurrencyApiService } from '@core/services/currency-api.service';
import { BudgetsStateService } from '@core/state/budgets.state';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

@Injectable({ providedIn: 'root' })
export class TransactionsStateService {
  private readonly transactionService = inject(TransactionService);
  private readonly conceptsService    = inject(ConceptsService);
  private readonly currencyApi        = inject(CurrencyApiService);
  private readonly budgetsState       = inject(BudgetsStateService);

  private readonly _items   = signal<ITransaction[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error   = signal<string | null>(null);
  private readonly _rowMap  = signal<Record<string, number>>({});

  /** Transacciones del usuario. */
  readonly items   = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error   = this._error.asReadonly();
  /** Mapa txId → número de fila en Sheets. */
  readonly rowMap  = this._rowMap.asReadonly();

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    firstValueFrom(this.transactionService.loadTransactions())
      .then(({ transactions, rowMap }) => {
        const newRecurring = this.transactionService.processRecurring(transactions);
        if (newRecurring.length === 0) {
          this._items.set(transactions);
          this._rowMap.set(rowMap);
          return;
        }
        return firstValueFrom(
          from(newRecurring).pipe(
            concatMap(tx => this.transactionService.saveTransaction(tx)),
            toArray(),
          ),
        ).then(() => {
          this._items.set([...transactions, ...newRecurring]);
          this._rowMap.set(rowMap);
        });
      })
      .catch(err => this._error.set(String(err)))
      .finally(() => this._loading.set(false));
  }

  add(draft: TransactionDraft, userBaseCurrency: string): void {
    const txId = crypto.randomUUID();
    this.transactionService.createTransaction(draft, txId, userBaseCurrency)
      .then(transaction => {
        const prevItems = this._items();
        this._items.update(items => [...items, transaction]);
        return firstValueFrom(this.transactionService.saveTransaction(transaction))
          .then(() => {
            this.conceptsService.upsertConcept(transaction).catch(() => {});
            if (transaction.type === TRANSACTION_TYPES.EXPENSE) {
              this.budgetsState.recalculate(
                transaction.categoryId,
                transaction.date.slice(0, 7),
                this._items(),
              );
            }
            // Recarga para sincronizar _rowMap con el número de fila real en Sheets.
            // Sin esto, editar una transacción recién agregada en la misma sesión crea un duplicado.
            this.load();
          })
          .catch(err => {
            this._items.set(prevItems);
            this._error.set(String(err));
          });
      })
      .catch(err => this._error.set(String(err)));
  }

  update(transaction: ITransaction, rowNumber: number, userBaseCurrency: string): void {
    const prevItems = this._items();
    firstValueFrom(this.currencyApi.getRate(transaction.currency, userBaseCurrency))
      .then(rate => {
        const updated: ITransaction = {
          ...transaction,
          amountBase: transaction.amount * rate,
          updatedAt:  new Date().toISOString(),
        };
        this._items.update(items => items.map(t => t.txId === updated.txId ? updated : t));
        return firstValueFrom(this.transactionService.updateTransaction(updated, rowNumber))
          .then(() => {
            if (updated.type === TRANSACTION_TYPES.EXPENSE) {
              this.budgetsState.recalculate(
                updated.categoryId,
                updated.date.slice(0, 7),
                this._items(),
              );
            }
          })
          .catch(err => {
            this._items.set(prevItems);
            this._error.set(String(err));
          });
      })
      .catch(err => {
        this._items.set(prevItems);
        this._error.set(String(err));
      });
  }

  delete(txId: string, rowNumber: number): void {
    const prevItems = this._items();
    const deletedTx = prevItems.find(t => t.txId === txId);
    this._items.update(items => items.filter(t => t.txId !== txId));
    firstValueFrom(this.transactionService.deleteTransaction(rowNumber))
      .then(() => {
        if (deletedTx?.type === TRANSACTION_TYPES.EXPENSE) {
          this.budgetsState.recalculate(
            deletedTx.categoryId,
            deletedTx.date.slice(0, 7),
            this._items(),
          );
        }
      })
      .catch(err => {
        this._items.set(prevItems);
        this._error.set(String(err));
      });
  }
}
