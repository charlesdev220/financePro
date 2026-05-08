import { Injectable } from '@angular/core';
import { ITransaction } from '@models/transaction.model';
import { ICategory } from '@models/category.model';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';
import { APP_COLORS } from '@core/constants/colors.constants';

export interface PeriodSummary {
  income:  number;
  expense: number;
  balance: number;
}

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
  date: string;
  count: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

  /**
   * Calcula el resumen financiero (ingresos, gastos, balance) de un array de transacciones.
   * El llamador es responsable de filtrar por rango de fechas antes de invocar.
   */
  calculateSummary(txs: ITransaction[]): PeriodSummary {
    const safe = (n: number) => (isNaN(n) || !isFinite(n) ? 0 : n);
    const income  = txs
      .filter(t => t.type === TRANSACTION_TYPES.INCOME)
      .reduce((sum, t) => sum + safe(t.amountBase), 0);
    const expense = txs
      .filter(t => t.type === TRANSACTION_TYPES.EXPENSE)
      .reduce((sum, t) => sum + safe(t.amountBase), 0);
    return { income, expense, balance: income - expense };
  }

  /**
   * Comparación inter-anual: agrupa TODAS las transacciones disponibles por mes custom
   * y devuelve solo los períodos cuyo mes de display coincide con `displayMonth` (1-12).
   * Permite ver el mismo mes a lo largo de distintos años (ej: Mayo 2022-2026).
   */
  getSameMonthAcrossYears(
    txs: ITransaction[],
    displayMonth: number,
    monthStartDay: number,
  ): MonthlyTotal[] {
    const all      = this.getMonthlyTotals(txs, 9999, monthStartDay);
    const monthStr = String(displayMonth).padStart(2, '0');
    return all.filter(t => t.period.endsWith(`-${monthStr}`));
  }

  /**
   * Agrupa transacciones por período custom y suma income/expense usando amountBase.
   * Con monthStartDay > 1, una transacción del día >= startDay pertenece al período
   * del mes SIGUIENTE (ej: startDay=27 → transacción del 28/04 → período "2026-05").
   * Retorna los últimos `months` períodos con datos, ordenados cronológicamente.
   */
  getMonthlyTotals(txs: ITransaction[], months: number, monthStartDay: number = 1): MonthlyTotal[] {
    if (!txs.length) return [];

    const map = new Map<string, MonthlyTotal>();

    for (const tx of txs) {
      const d     = new Date(tx.date + 'T12:00:00');
      const day   = d.getDate();
      const month = d.getMonth();     // 0-based
      const year  = d.getFullYear();

      let periodMonth: number;
      let periodYear:  number;

      if (monthStartDay <= 1) {
        // Mes calendario estándar
        periodMonth = month;
        periodYear  = year;
      } else if (day >= monthStartDay) {
        // El día cae en la primera parte del período → pertenece al mes siguiente
        const next  = month + 1;
        periodMonth = next % 12;
        periodYear  = year + Math.floor(next / 12);
      } else {
        // El día cae en la segunda parte del período → pertenece al mismo mes
        periodMonth = month;
        periodYear  = year;
      }

      const period = `${periodYear}-${String(periodMonth + 1).padStart(2, '0')}`;

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
   * Devuelve siempre los 12 períodos del año YYYY aunque no tengan transacciones.
   * Garantiza que el gráfico anual muestre todos los meses del 1 al 12.
   */
  getYearMonthlyTotals(txs: ITransaction[], year: number, monthStartDay: number): MonthlyTotal[] {
    const actual = this.getMonthlyTotals(txs, 9999, monthStartDay);
    return Array.from({ length: 12 }, (_, i) => {
      const period = `${year}-${String(i + 1).padStart(2, '0')}`;
      return actual.find(t => t.period === period) ?? { period, income: 0, expense: 0 };
    });
  }

  /**
   * Agrupa todo el historial de transacciones por año calendario y suma income/expense.
   * Retorna una entrada por año ordenada cronológicamente.
   */
  getYearlyTotals(txs: ITransaction[], monthStartDay: number = 1): MonthlyTotal[] {
    if (!txs.length) return [];
    const monthly = this.getMonthlyTotals(txs, 9999, monthStartDay);
    const map = new Map<string, MonthlyTotal>();
    for (const m of monthly) {
      const year = m.period.slice(0, 4);
      if (!map.has(year)) map.set(year, { period: year, income: 0, expense: 0 });
      const entry = map.get(year)!;
      entry.income  += m.income;
      entry.expense += m.expense;
    }
    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
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
    const recurrentes: SpendingItem[] = this.deduplicateByConcept(
      expenses.filter(tx => tx.isRecurring || (conceptPeriods.get(tx.concept)?.size ?? 0) >= 3)
    ).sort((a, b) => b.amountBase - a.amountBase);

    // Superfluos: amountBase ≥ P75 (requiere ≥4 gastos)
    let superfluos: SpendingItem[] = [];
    if (expenses.length >= 4) {
      const sorted   = [...expenses].sort((a, b) => a.amountBase - b.amountBase);
      const p75Index = Math.floor(sorted.length * 0.75);
      const p75      = sorted[p75Index].amountBase;

      superfluos = this.deduplicateByConcept(
        expenses.filter(tx => tx.amountBase >= p75)
      ).sort((a, b) => b.amountBase - a.amountBase);
    }

    return { recurrentes, superfluos };
  }

  /** Agrupa transacciones por concepto: conserva la más reciente y agrega count. */
  private deduplicateByConcept(txs: ITransaction[]): SpendingItem[] {
    const map = new Map<string, SpendingItem>();
    for (const tx of txs) {
      const existing = map.get(tx.concept);
      if (!existing) {
        map.set(tx.concept, {
          concept:     tx.concept,
          categoryId:  tx.categoryId,
          amountBase:  tx.amountBase,
          isRecurring: tx.isRecurring,
          date:        tx.date,
          count:       1,
        });
      } else {
        existing.count++;
        if (tx.date > existing.date) {
          existing.date       = tx.date;
          existing.amountBase = tx.amountBase;
        }
      }
    }
    return Array.from(map.values());
  }
}
