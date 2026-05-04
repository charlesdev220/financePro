import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartData } from 'chart.js';
import { ChartPieComponent } from '@shared/components/chart-pie/chart-pie.component';
import { CategoryBreakdown } from '@features/dashboard/services/dashboard.service';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';
import { IBudget } from '@models/budget.model';
import { APP_COLORS } from '@core/constants/colors.constants';

@Component({
  selector: 'app-dashboard-chart',
  templateUrl: 'dashboard-chart.component.html',
  styleUrls: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChartPieComponent, CurrencyFormatPipe],
})
export class DashboardChartComponent {
  /** Lista de categorías con montos del período activo, separadas por tipo (income/expense). */
  breakdown = input.required<CategoryBreakdown[]>();
  balance = input.required<number>();
  currency = input.required<string>();
  /** Presupuestos del período activo para mostrar indicadores micro en la leyenda de gastos. */
  budgets = input<IBudget[]>([]);
  /** Presupuesto mensual por defecto (de UserSettings) para categorías sin registro en BUDGETS. */
  defaultBudget = input<number>(200);
  /** Proveniente de DashboardPage.ionViewDidEnter para forzar resize del chart al volver al tab. */
  refreshTick = input<number>(0);

  /** Datos formateados para Chart.js doughnut, derivados del breakdown del período activo. */
  readonly chartData = computed<ChartData<'doughnut'> | null>(() => {
    const b = this.breakdown();
    if (!b?.length) return null;
    return {
      labels: b.map(item => item.icon),
      datasets: [{ data: b.map(item => item.amount), backgroundColor: b.map(item => item.color) }],
    };
  });

  /** Breakdown enriquecido con el porcentaje de cada ítem sobre el total de SU grupo (ingresos o gastos). */
  readonly breakdownWithPct = computed(() => {
    const b = this.breakdown();
    const safeAmount = (n: number) => (isNaN(n) || !isFinite(n) ? 0 : n);
    const totalIncome = b.filter(i => i.type === TRANSACTION_TYPES.INCOME).reduce((s, i) => s + safeAmount(i.amount), 0);
    const totalExpense = b.filter(i => i.type === TRANSACTION_TYPES.EXPENSE).reduce((s, i) => s + safeAmount(i.amount), 0);
    return b.map(item => {
      const amount = safeAmount(item.amount);
      const groupTotal = item.type === TRANSACTION_TYPES.INCOME ? totalIncome : totalExpense;
      const pct = groupTotal > 0 ? Math.round((amount / groupTotal) * 100) : 0;
      return { ...item, amount, pct };
    });
  });

  /** Ítems de tipo income con porcentaje calculado. */
  readonly incomeItems = computed(() =>
    this.breakdownWithPct().filter(item => item.type === TRANSACTION_TYPES.INCOME)
  );

  /**
   * Ítems de tipo expense con pila de progreso siempre visible.
   * Si hay presupuesto → pct = spentAmount/budgetAmount, color por status.
   * Si no hay presupuesto → pct = % de esa categoría sobre el total de gastos, color gris.
   */
  readonly expenseItems = computed(() => {
    const budgetMap = new Map<string, IBudget>();
    for (const b of this.budgets()) budgetMap.set(b.categoryId, b);

    return this.breakdownWithPct()
      .filter(item => item.type === TRANSACTION_TYPES.EXPENSE)
      .map(item => {
        const b = budgetMap.get(item.categoryId);
        const budgetAmount = (b && b.budgetAmount > 0) ? b.budgetAmount : this.defaultBudget();
        const spentAmount = (b && b.budgetAmount > 0) ? b.spentAmount : item.amount;
        const raw = (spentAmount / budgetAmount) * 100;
        const pct = isNaN(raw) || !isFinite(raw) ? 0 : Math.min(100, Math.round(raw));
        const color = pct >= 80 ? APP_COLORS.RED : item.color;
        // showBudgetLabel: true siempre — todas las categorías de gasto muestran consumo vs presupuesto
        return { ...item, budgetMeta: { pct, color, hasBudget: !!(b && b.budgetAmount > 0), showBudgetLabel: true } };
      });
  });
}
