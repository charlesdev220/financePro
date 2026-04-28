/**
 * Excepción arquitectónica: este service llama directamente a SheetsApiService.
 * Regla ngrx.md: "SheetsApiService solo en Effects".
 * Motivo: TransactionService actúa como orchestrator de transformación de datos previa al dispatch —
 * calcula amount_base (conversión de divisa), procesa transacciones recurrentes y escribe filas en Sheets.
 * Esta lógica de dominio compleja no encaja en un effect funcional sin añadir complejidad excesiva.
 * Decisión aprobada en CLAUDE.md como excepción documentada de servicio auxiliar pre-dispatch.
 */
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { CurrencyApiService } from '@core/services/currency-api.service';
import { AuthService } from '@core/services/auth.service';
import { ITransaction, TransactionDraft } from '@models/transaction.model';

// TRANSACTIONS schema (A:P — 16 columnas)
// A: tx_id | B: user_id | C: wallet_id | D: category_id | E: amount
// F: currency | G: amount_base | H: concept | I: date | J: type
// K: is_recurring | L: recurrence_rule | M: notes | N: created_at | O: updated_at | P: workspace_id

export function rowToTransaction(row: unknown[], defaultWsId = ''): ITransaction {
  return {
    txId: String(row[0] ?? ''),
    userId: String(row[1] ?? ''),
    walletId: String(row[2] ?? ''),
    categoryId: String(row[3] ?? ''),
    amount: Number(String(row[4] ?? 0).replace(',', '.')),
    currency: String(row[5] ?? 'EUR'),
    amountBase: Number(String(row[6] ?? 0).replace(',', '.')),
    concept: String(row[7] ?? ''),
    date: String(row[8] ?? ''),
    type: (String(row[9] ?? 'expense') as 'income' | 'expense'),
    isRecurring: String(row[10] ?? 'false') === 'true' || row[10] === true,
    recurrenceRule: row[11] ? String(row[11]) : null,
    notes: row[12] ? String(row[12]) : null,
    createdAt: String(row[13] ?? new Date().toISOString()),
    updatedAt: String(row[14] ?? new Date().toISOString()),
    workspaceId: String(row[15] ?? defaultWsId),
  };
}

export function transactionToRow(tx: ITransaction): unknown[] {
  return [
    tx.txId,
    tx.userId,
    tx.walletId,
    tx.categoryId,
    tx.amount,
    tx.currency,
    tx.amountBase,
    tx.concept,
    tx.date,
    tx.type,
    tx.isRecurring,
    tx.recurrenceRule ?? '',
    tx.notes ?? '',
    tx.createdAt,
    tx.updatedAt,
    tx.workspaceId,
  ];
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly sheetsApi = inject(SheetsApiService);
  private readonly currencyApi = inject(CurrencyApiService);
  private readonly authService = inject(AuthService);

  loadTransactions(defaultWsId = ''): Observable<{ transactions: ITransaction[]; rowMap: Record<string, number> }> {
    return this.sheetsApi.getRange('TRANSACTIONS!A:P').pipe(
      map(response => {
        if (!response?.values || response.values.length < 2) {
          return { transactions: [], rowMap: {} };
        }
        const allRows = response.values.slice(1);
        const userId = this.authService.getUser()?.sub ?? '';
        const rowMap: Record<string, number> = {};
        allRows.forEach((row, i) => {
          const id = String(row[0] ?? '');
          const uid = String(row[1] ?? '');
          if (id && uid === userId) rowMap[id] = i + 2;
        });
        console.log('allRows', allRows);
        const transactions = allRows
          .filter(row => row[0] && String(row[1] ?? '') === userId)
          .map(row => rowToTransaction(row, defaultWsId));
        return { transactions, rowMap };
      }),
    );
  }

  /**
   * Construye un ITransaction completo a partir de un draft del formulario.
   * Calcula amount_base usando la tasa de cambio vigente.
   * El tx_id se genera fuera (en el Effect) para el patrón optimista.
   */
  async createTransaction(
    draft: TransactionDraft,
    txId: string,
    workspaceId: string,
    userBaseCurrency: string,
  ): Promise<ITransaction> {
    const rate = await firstValueFrom(this.currencyApi.getRate(draft.currency, userBaseCurrency));
    const now = new Date().toISOString();
    return {
      ...draft,
      txId,
      workspaceId,
      amountBase: draft.amount * rate,
      createdAt: now,
      updatedAt: now,
    };
  }

  saveTransaction(tx: ITransaction): Observable<unknown> {
    return this.sheetsApi.appendRow('TRANSACTIONS!A1', [transactionToRow(tx)]);
  }

  updateTransaction(tx: ITransaction, rowNumber: number): Observable<unknown> {
    return this.sheetsApi.updateRow(
      `TRANSACTIONS!A${rowNumber}:P${rowNumber}`,
      [transactionToRow(tx)],
    );
  }

  deleteTransaction(rowNumber: number): Observable<unknown> {
    return this.sheetsApi.deleteRow(`TRANSACTIONS!A${rowNumber}:P${rowNumber}`);
  }

  /**
   * Detecta transacciones recurrentes vencidas y genera las nuevas ocurrencias.
   * Se ejecuta al arranque de la app (en el Effect loadTransactions$).
   */
  processRecurring(transactions: ITransaction[]): ITransaction[] {
    const now = new Date();
    const newTxs: ITransaction[] = [];

    const recurring = transactions.filter(t => t.isRecurring && t.recurrenceRule);
    for (const tx of recurring) {
      const nextDate = this._nextOccurrence(tx.date, tx.recurrenceRule!);
      if (!nextDate || nextDate > now) continue;

      const alreadyExists = transactions.some(
        t =>
          t.walletId === tx.walletId &&
          t.categoryId === tx.categoryId &&
          t.concept === tx.concept &&
          t.isRecurring &&
          this._sameOccurrencePeriod(t.date, nextDate, tx.recurrenceRule!),
      );

      if (!alreadyExists) {
        const isoDate = nextDate.toISOString().split('T')[0];
        const isoNow = new Date().toISOString();
        newTxs.push({
          ...tx,
          txId: crypto.randomUUID(),
          date: isoDate,
          createdAt: isoNow,
          updatedAt: isoNow,
        });
      }
    }

    return newTxs;
  }

  private _nextOccurrence(lastDate: string, rule: string): Date | null {
    const d = new Date(`${lastDate}T00:00:00`);
    if (isNaN(d.getTime())) return null;
    switch (rule) {
      case 'daily': d.setDate(d.getDate() + 1); break;
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      default: return null;
    }
    return d;
  }

  private _sameOccurrencePeriod(date: string, target: Date, rule: string): boolean {
    const d = new Date(`${date}T00:00:00`);
    switch (rule) {
      case 'daily':
        return d.toDateString() === target.toDateString();
      case 'weekly': {
        const weekOf = (dt: Date) => {
          const tmp = new Date(dt);
          tmp.setHours(0, 0, 0, 0);
          tmp.setDate(tmp.getDate() - tmp.getDay());
          return tmp.getTime();
        };
        return weekOf(d) === weekOf(target);
      }
      case 'monthly':
        return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
      default:
        return false;
    }
  }
}
