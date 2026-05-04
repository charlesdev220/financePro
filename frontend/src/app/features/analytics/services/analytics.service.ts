import { Injectable } from '@angular/core';
import { ITransaction } from '@models/transaction.model';
import { ICategory } from '@models/category.model';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';
import { APP_COLORS } from '@core/constants/colors.constants';

export interface MonthlyTotal {
  period: string; // YYYY-MM
  income: number;
  expense: number;
}

export interface CategoryTotal {
  categoryId: string;
  total: number;
}

export interface CategorySpendingItem {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  total: number;
}

export interface SpendingItem {
  concept: string;
  categoryId: string;
  amountBase: number;
  isRecurring: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

  /**
   * Agrupa transacciones por período YYYY-MM y suma income/expense usando amountBase.
   * Retorna los últimos `months` períodos con datos, ordenados cronológicamente.
   */
  getMonthlyTotals(txs: ITransaction[], months: number): MonthlyTotal[] {
    if (!txs.length) return [];

    const map = new Map<string, MonthlyTotal>();

    for (const tx of txs) {
      const period = tx.date.slice(0, 7);
      if (!map.has(period)) {
        map.set(period, { period, income: 0, expense: 0 });
      }
      const entry = map.get(period)!;
      if (tx.type === TRANSACTION_TYPES.INCOME) {
        entry.income += tx.amountBase;
      } else {
        entry.expense += tx.amountBase;
      }
    }

    return Array.from(map.values())
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-months);
  }

  /**
   * Agrupa transacciones por categoryId y suma amountBase.
   * Si se pasa categoryId, filtra solo esa categoría.
   */
  getCategoryTotals(txs: ITransaction[], categoryId?: string): CategoryTotal[] {
    const filtered = categoryId ? txs.filter(tx => tx.categoryId === categoryId) : txs;
    if (!filtered.length) return [];

    const map = new Map<string, number>();

    for (const tx of filtered) {
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amountBase);
    }

    return Array.from(map.entries()).map(([id, total]) => ({
      categoryId: id,
      total,
    }));
  }

  /**
   * Agrupa solo gastos por categoría, enriquece con metadatos de ICategory
   * y devuelve la lista ordenada DESC por total.
   */
  getCategorySpending(txs: ITransaction[], categories: ICategory[]): CategorySpendingItem[] {
    const expenses = txs.filter(tx => tx.type === TRANSACTION_TYPES.EXPENSE);
    if (!expenses.length) return [];

    const map = new Map<string, number>();
    for (const tx of expenses) {
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amountBase);
    }

    return Array.from(map.entries())
      .map(([categoryId, total]) => {
        const cat = categories.find(c => c.categoryId === categoryId);
        return {
          categoryId,
          name:  cat?.name  ?? 'Otros',
          icon:  cat?.icon  ?? '💰',
          color: cat?.color ?? APP_COLORS.GRAY,
          total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  /**
   * Regresión lineal OLS (mínimos cuadrados ordinarios).
   * Retorna {slope, intercept}. Si hay menos de 2 puntos, retorna {slope:0, intercept:0}.
   */
  linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
    const n = points.length;
    if (n < 2) return { slope: 0, intercept: 0 };

    const sumX  = points.reduce((acc, p) => acc + p.x, 0);
    const sumY  = points.reduce((acc, p) => acc + p.y, 0);
    const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0);

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: sumY / n };

    const slope     = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    return {
      slope:     Math.round(slope * 100) / 100,
      intercept: Math.round(intercept * 100) / 100,
    };
  }

  /**
   * Clasifica gastos en:
   * - recurrentes: isRecurring===true OR concepto aparece en ≥3 períodos distintos
   * - superfluos: amountBase ≥ P75 del historial (solo si hay ≥4 gastos)
   * Ambas listas ordenadas por amountBase DESC.
   */
  classifySpending(
    txs: ITransaction[],
    periods: string[],
  ): { recurrentes: SpendingItem[]; superfluos: SpendingItem[] } {
    const expenses = txs.filter(tx => tx.type === TRANSACTION_TYPES.EXPENSE);

    if (!expenses.length) {
      return { recurrentes: [], superfluos: [] };
    }

    // Mapa: concepto → set de períodos en los que aparece
    const conceptPeriods = new Map<string, Set<string>>();
    for (const tx of expenses) {
      const period = tx.date.slice(0, 7);
      if (!conceptPeriods.has(tx.concept)) {
        conceptPeriods.set(tx.concept, new Set());
      }
      conceptPeriods.get(tx.concept)!.add(period);
    }

    // Recurrentes: isRecurring OR aparece en ≥3 períodos
    const recurrentes: SpendingItem[] = expenses
      .filter(tx => tx.isRecurring || (conceptPeriods.get(tx.concept)?.size ?? 0) >= 3)
      .map(tx => ({
        concept:    tx.concept,
        categoryId: tx.categoryId,
        amountBase: tx.amountBase,
        isRecurring: tx.isRecurring,
      }))
      .sort((a, b) => b.amountBase - a.amountBase);

    // Superfluos: amountBase ≥ P75 (requiere ≥4 gastos)
    let superfluos: SpendingItem[] = [];
    if (expenses.length >= 4) {
      const sorted   = [...expenses].sort((a, b) => a.amountBase - b.amountBase);
      const p75Index = Math.floor(sorted.length * 0.75);
      const p75      = sorted[p75Index].amountBase;

      superfluos = expenses
        .filter(tx => tx.amountBase >= p75)
        .map(tx => ({
          concept:    tx.concept,
          categoryId: tx.categoryId,
          amountBase: tx.amountBase,
          isRecurring: tx.isRecurring,
        }))
        .sort((a, b) => b.amountBase - a.amountBase);
    }

    return { recurrentes, superfluos };
  }
}
