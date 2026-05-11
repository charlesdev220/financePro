import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, from, concatMap, toArray, map, Observable } from 'rxjs';
import { AppendResponse, rowToTransaction, transactionToRow, processRecurring } from '@features/transactions/services/transaction.service';
import { ITransaction, TransactionDraft } from '@models/transaction.model';
import { ConceptsService } from '@core/services/concepts.service';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
import { CurrencyApiService } from '@core/services/currency-api.service';
import { BudgetsStateService } from '@core/state/budgets.state';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

@Injectable({ providedIn: 'root' })
export class TransactionsStateService {
  private readonly sheetsApi = inject(SheetsApiService);
  private readonly authService = inject(AuthService);
  private readonly conceptsService = inject(ConceptsService);
  private readonly currencyApi = inject(CurrencyApiService);
  private readonly budgetsState = inject(BudgetsStateService);
  private readonly workspacesState = inject(WorkspacesStateService);

  private readonly _allItems = signal<ITransaction[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _rowMap = signal<Record<string, number>>({});/**OJO */
  private readonly _loaded = signal<boolean>(false);

  /** Transacciones del workspace activo. Las transacciones sin workspaceId heredan el workspace default (retrocompatibilidad). */
  readonly items = computed(() => {
    const activeId = this.workspacesState.activeWorkspaceId();
    const defaultId = this.workspacesState.defaultWorkspaceId();
    return this._allItems().filter(t => (t.workspaceId || defaultId) === activeId);
  });
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  /** Mapa txId → número de fila en Sheets. */
  readonly rowMap = this._rowMap.asReadonly();

  load(force = false): Promise<void> {
    if (this._loaded() && !force) return Promise.resolve();
    const defaultWsId = this.workspacesState.defaultWorkspaceId();
    this._loading.set(true);
    this._error.set(null);
    return firstValueFrom(
      this.sheetsApi.getRange('TRANSACTIONS!A:P').pipe(
        map(response => {
          if (!response?.values || response.values.length < 2) return { transactions: [], rowMap: {} };
          const allRows = response.values.slice(1);
          const userId = this.authService.getUser()?.sub ?? '';
          const rowMap: Record<string, number> = {};
          allRows.forEach((row, i) => {
            const id = String(row[0] ?? '');
            const uid = String(row[1] ?? '');
            if (id && uid === userId) rowMap[id] = i + 2;
          });
          const transactions = allRows
            .filter(row => row[0] && String(row[1] ?? '') === userId)
            .map(row => rowToTransaction(row, defaultWsId));
          return { transactions, rowMap };
        }),
      ),
    )
      .then(({ transactions, rowMap }) => {
        const newRecurring = processRecurring(transactions);
        if (newRecurring.length === 0) {
          this._allItems.set(transactions);
          this._rowMap.set(rowMap);
          this._loaded.set(true);
          return;
        }
        return firstValueFrom(
          from(newRecurring).pipe(
            concatMap(tx => this.sheetsApi.appendRow('TRANSACTIONS!A1', [transactionToRow(tx)]) as Observable<AppendResponse>),
            toArray(),
          ),
        ).then(() => {
          this._allItems.set([...transactions, ...newRecurring]);
          this._rowMap.set(rowMap);
          this._loaded.set(true);
        });
      })
      .catch(err => this._error.set(String(err)))
      .finally(() => this._loading.set(false));
  }

  add(draft: TransactionDraft, userBaseCurrency: string): void {
    const txId = crypto.randomUUID();
    const workspaceId = this.workspacesState.activeWorkspaceId();
    firstValueFrom(this.currencyApi.getRate(draft.currency, userBaseCurrency))
      .then(rate => {
        const now = new Date().toISOString();
        const transaction: ITransaction = {
          ...draft,
          txId,
          workspaceId,
          amountBase: draft.amount * rate,
          createdAt: now,
          updatedAt: now,
        };
        const prevItems = this._allItems();
        this._allItems.update(items => [...items, transaction]);
        return firstValueFrom(this.sheetsApi.appendRow('TRANSACTIONS!A1', [transactionToRow(transaction)]) as Observable<AppendResponse>)
          .then((response: AppendResponse) => {
            const rowNumber = this._parseRowNumber(response?.updates?.updatedRange);
            if (rowNumber) {
              this._rowMap.update(m => ({ ...m, [transaction.txId]: rowNumber }));
            } else {
              this.load(true);
            }
            this.conceptsService.upsertConcept(transaction).catch(() => { });/** promise */
            if (transaction.type === TRANSACTION_TYPES.EXPENSE) {
              this.budgetsState.recalculate(
                transaction.categoryId,
                transaction.date.slice(0, 7),
                this._allItems(),
              );
            }
          })
          .catch(err => {
            this._allItems.set(prevItems);
            this._error.set(String(err));
          });
      })
      .catch(err => this._error.set(String(err)));
  }

  update(transaction: ITransaction, rowNumber: number, userBaseCurrency: string): void {
    const prevItems = this._allItems();
    firstValueFrom(this.currencyApi.getRate(transaction.currency, userBaseCurrency))
      .then(rate => {
        const updated: ITransaction = {
          ...transaction,
          amountBase: transaction.amount * rate,
          updatedAt: new Date().toISOString(),
        };
        this._allItems.update(items => items.map(t => t.txId === updated.txId ? updated : t));
        return firstValueFrom(this.sheetsApi.updateRow(`TRANSACTIONS!A${rowNumber}:P${rowNumber}`, [transactionToRow(updated)]))
          .then(() => {
            if (updated.type === TRANSACTION_TYPES.EXPENSE) {
              this.budgetsState.recalculate(
                updated.categoryId,
                updated.date.slice(0, 7),
                this._allItems(),
              );
            }
          })
          .catch(err => {
            this._allItems.set(prevItems);
            this._error.set(String(err));
          });
      })
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }

  private _parseRowNumber(range: string | undefined): number | null {
    if (!range) return null;
    const match = range.match(/!A(\d+)/);
    return match ? Number(match[1]) : null;
  }

  delete(txId: string, rowNumber: number): void {
    const prevItems = this._allItems();
    const deletedTx = prevItems.find(t => t.txId === txId);
    this._allItems.update(items => items.filter(t => t.txId !== txId));
    firstValueFrom(this.sheetsApi.deleteRow(`TRANSACTIONS!A${rowNumber}:P${rowNumber}`))
      .then(() => {
        if (deletedTx?.type === TRANSACTION_TYPES.EXPENSE) {
          this.budgetsState.recalculate(
            deletedTx.categoryId,
            deletedTx.date.slice(0, 7),
            this._allItems(),
          );
        }
      })
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }
}
