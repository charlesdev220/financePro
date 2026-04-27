import { Injectable } from '@angular/core';
import { ITransaction } from '@models/transaction.model';
import { ICategory } from '@models/category.model';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  type: 'income' | 'expense';
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  /**
   * Calcula el resumen financiero del período dado.
   * Filtra transacciones cuya fecha comience con el period (YYYY-MM).
   */
  calculateSummary(transactions: ITransaction[], period: string): DashboardSummary {
    const periodTxs = transactions.filter(t => t.date.startsWith(period));
    const safe = (n: number) => (isNaN(n) || !isFinite(n) ? 0 : n);
    const totalIncome = periodTxs
      .filter(t => t.type === TRANSACTION_TYPES.INCOME)
      .reduce((sum, t) => sum + safe(t.amountBase), 0);
    const totalExpenses = periodTxs
      .filter(t => t.type === TRANSACTION_TYPES.EXPENSE)
      .reduce((sum, t) => sum + safe(t.amountBase), 0);
    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
    };
  }

  /**
   * Calcula el desglose de movimientos por categoría para el período,
   * separando ingresos y gastos. Devuelve top 6 por tipo + "Otros" si hay más.
   * Los ingresos se listan primero, luego los gastos.
   */
  calculateBreakdown(
    transactions: ITransaction[],
    categories: ICategory[],
    period: string,
  ): CategoryBreakdown[] {
    const periodTxs = transactions.filter(t => t.date.startsWith(period));
    if (periodTxs.length === 0) return [];

    const buildGroup = (
      txs: ITransaction[],
      type: 'income' | 'expense',
      idSuffix: string,
    ): CategoryBreakdown[] => {
      if (!txs.length) return [];
      const grouped = new Map<string, number>();
      for (const tx of txs) {
        const safe = isNaN(tx.amountBase) || !isFinite(tx.amountBase) ? 0 : tx.amountBase;
        grouped.set(tx.categoryId, (grouped.get(tx.categoryId) ?? 0) + safe);
      }
      const sorted = Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]);
      const top6 = sorted.slice(0, 6);
      const rest = sorted.slice(6);

      const result: CategoryBreakdown[] = top6.map(([categoryId, amount]) => {
        const cat = categories.find(c => c.categoryId === categoryId);
        return {
          categoryId,
          name: cat?.name ?? categoryId,
          icon: cat?.icon ?? '💰',
          color: cat?.color ?? '#9E9E9E',
          amount,
          type,
        };
      });

      if (rest.length > 0) {
        result.push({
          categoryId: `others-${idSuffix}`,
          name: 'Otros',
          icon: '💰',
          color: '#9E9E9E',
          amount: rest.reduce((sum, [, a]) => sum + a, 0),
          type,
        });
      }
      return result;
    };

    const incomeTxs  = periodTxs.filter(t => t.type === TRANSACTION_TYPES.INCOME);
    const expenseTxs = periodTxs.filter(t => t.type === TRANSACTION_TYPES.EXPENSE);

    return [
      ...buildGroup(incomeTxs,  TRANSACTION_TYPES.INCOME,  'income'),
      ...buildGroup(expenseTxs, TRANSACTION_TYPES.EXPENSE, 'expense'),
    ];
  }

  /**
   * Devuelve las últimas `limit` transacciones del período, ordenadas DESC por fecha.
   */
  getRecentTransactions(
    transactions: ITransaction[],
    period: string,
    limit = 5,
  ): ITransaction[] {
    return transactions
      .filter(t => t.date.startsWith(period))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
  }
}
