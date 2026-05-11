import { Injectable } from '@angular/core';
import { ITransaction } from '@models/transaction.model';

// TRANSACTIONS schema (A:P — 16 columnas)
// A: tx_id | B: user_id | C: wallet_id | D: category_id | E: amount
// F: currency | G: amount_base | H: concept | I: date | J: type
// K: is_recurring | L: recurrence_rule | M: notes | N: created_at | O: updated_at | P: workspace_id

export interface AppendResponse {
  updates?: {
    updatedRange?: string;
    updatedRows?: number;
  };
}

function parseNum(v: unknown): number {
  const n = Number(String(v ?? 0).replace(',', '.'));
  return isNaN(n) || !isFinite(n) ? 0 : n;
}

export function rowToTransaction(row: unknown[], defaultWsId = ''): ITransaction {
  return {
    txId: String(row[0] ?? ''),
    userId: String(row[1] ?? ''),
    walletId: String(row[2] ?? ''),
    categoryId: String(row[3] ?? ''),
    amount: parseNum(row[4]),
    currency: String(row[5] ?? 'EUR'),
    amountBase: parseNum(row[6]),
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

function _nextOccurrence(lastDate: string, rule: string): Date | null {
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

function _sameOccurrencePeriod(date: string, target: Date, rule: string): boolean {
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

/**
 * Detecta transacciones recurrentes vencidas y genera las nuevas ocurrencias.
 * Se ejecuta al arranque de la app (en TransactionsStateService.load()).
 */
export function processRecurring(transactions: ITransaction[]): ITransaction[] {
  const now = new Date();
  const newTxs: ITransaction[] = [];

  const recurring = transactions.filter(t => t.isRecurring && t.recurrenceRule);
  for (const tx of recurring) {
    const nextDate = _nextOccurrence(tx.date, tx.recurrenceRule!);
    if (!nextDate || nextDate > now) continue;

    const alreadyExists = transactions.some(
      t =>
        t.walletId === tx.walletId &&
        t.categoryId === tx.categoryId &&
        t.concept === tx.concept &&
        t.isRecurring &&
        _sameOccurrencePeriod(t.date, nextDate, tx.recurrenceRule!),
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

/**
 * TransactionService — mantenido con @Injectable para compatibilidad con tests actuales.
 * La lógica de persistencia fue absorbida por TransactionsStateService (REQ-07).
 */
@Injectable({ providedIn: 'root' })
export class TransactionService {
  processRecurring(transactions: ITransaction[]): ITransaction[] {
    return processRecurring(transactions);
  }
}
