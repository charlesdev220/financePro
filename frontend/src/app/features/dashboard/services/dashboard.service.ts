import { Injectable } from '@angular/core';
import { ITransaction } from '../../../models/transaction.model';
import { ICategory } from '../../../models/category.model';
import { TRANSACTION_TYPES } from '../../../core/constants/transaction.constants';

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  /**
   * Calcula el resumen financiero del período dado.
   * Filtra transacciones cuya fecha comience con el period (YYYY-MM).
   */
  calculateSummary(transactions: ITransaction[], period: string): DashboardSummary {
    const periodTxs = transactions.filter(t => t.date.startsWith(period));
    const totalIncome = periodTxs
      .filter(t => t.type === TRANSACTION_TYPES.INCOME)
      .reduce((sum, t) => sum + t.amountBase, 0);
    const totalExpenses = periodTxs
      .filter(t => t.type === TRANSACTION_TYPES.EXPENSE)
      .reduce((sum, t) => sum + t.amountBase, 0);
    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
    };
  }

  /**
   * Calcula el desglose de gastos por categoría para el período.
   * Devuelve top 6 categorías ordenadas DESC + "Otros" si hay más de 6.
   * Devuelve [] si no hay gastos en el período.
   */
  calculateBreakdown(
    transactions: ITransaction[],
    categories: ICategory[],
    period: string,
  ): CategoryBreakdown[] {
    const periodTxs = transactions.filter(
      t => t.date.startsWith(period),
    );

    if (periodTxs.length === 0) return [];

    const grouped = new Map<string, number>();
    for (const tx of periodTxs) {
      grouped.set(tx.categoryId, (grouped.get(tx.categoryId) ?? 0) + tx.amountBase);
    }

    const sorted = Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1]);

    const top6 = sorted.slice(0, 6);
    const rest = sorted.slice(6);

    const breakdown: CategoryBreakdown[] = top6.map(([categoryId, amount]) => {
      const cat = categories.find(c => c.categoryId === categoryId);
      return {
        categoryId,
        name: cat?.name ?? categoryId,
        color: cat?.color ?? '#9E9E9E',
        amount,
      };
    });

    if (rest.length > 0) {
      const othersAmount = rest.reduce((sum, [, amount]) => sum + amount, 0);
      breakdown.push({
        categoryId: 'others',
        name: 'Otros',
        color: '#9E9E9E',
        amount: othersAmount,
      });
    }

    return breakdown;
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
