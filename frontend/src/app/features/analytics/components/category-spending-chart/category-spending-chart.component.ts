import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartDataset } from 'chart.js';
import { ChartBarComponent } from '@shared/components/chart-bar/chart-bar.component';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';
import { CategorySpendingItem } from '@features/analytics/services/analytics.service';

@Component({
  selector: 'app-category-spending-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChartBarComponent, CurrencyFormatPipe],
  templateUrl: './category-spending-chart.component.html',
})
export class CategorySpendingChartComponent {
  /** Lista de gastos agrupados por categoría, ordenados DESC por total. */
  data = input<CategorySpendingItem[]>([]);
  /** Moneda base del usuario para formatear los montos. */
  currency = input<string>('EUR');

  /** Datos formateados para el bar chart de Chart.js. */
  readonly chartData = computed<{ datasets: ChartDataset[]; labels: string[] } | null>(() => {
    const items = this.data();
    if (!items.length) return null;
    return {
      labels: items.map(item => item.name),
      datasets: [{
        data:            items.map(item => item.total),
        backgroundColor: items.map(item => item.color),
        borderRadius:    4,
      }],
    };
  });

  /** Ítems enriquecidos con el porcentaje sobre el total de gastos del período. */
  readonly itemsWithPct = computed(() => {
    const items = this.data();
    const total = items.reduce((sum, item) => sum + item.total, 0);
    if (total === 0) return items.map(item => ({ ...item, pct: 0 }));
    return items.map(item => ({ ...item, pct: Math.round((item.total / total) * 100) }));
  });
}
