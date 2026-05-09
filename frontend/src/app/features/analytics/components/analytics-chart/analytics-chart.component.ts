import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartDataset } from 'chart.js';
import { ChartBarComponent } from '@shared/components/chart-bar/chart-bar.component';
import { MonthlyTotal } from '@features/analytics/services/analytics.service';
import { APP_COLORS } from '@core/constants/colors.constants';

const MONTH_LABELS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

@Component({
  selector: 'app-analytics-chart',
  standalone: true,
  imports: [ChartBarComponent],
  templateUrl: './analytics-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsChartComponent {
  data       = input<MonthlyTotal[]>([]);
  /** Descripción accesible del gráfico — varía según el tab activo del padre. */
  ariaLabel  = input<string>('Gráfico histórico de ingresos y gastos');

  /** Períodos del eje X en formato legible: "ene", "feb" o "ene '23" si hay múltiples años. */
  readonly labels = computed(() => {
    const hasMultipleYears = new Set(this.data().map(d => d.period.slice(0, 4))).size > 1;
    return this.data().map(t => {
      if (t.period.length !== 7) return t.period; // "YYYY" — vista anual histórica
      const monthName = MONTH_LABELS[parseInt(t.period.slice(5, 7), 10) - 1];
      return hasMultipleYears ? `${monthName} '${t.period.slice(2, 4)}` : monthName;
    });
  });

  /** True cuando al menos un período tiene ingresos o gastos mayores a cero. */
  readonly hasData = computed(() => this.data().some(t => t.income > 0 || t.expense > 0));

  /** Datasets de ingresos y gastos para Chart.js, derivados de los datos históricos. */
  readonly datasets = computed<ChartDataset[]>(() => [
    {
      label: 'Ingresos',
      data: this.data().map(t => t.income),
      backgroundColor: APP_COLORS.GREEN + 'b3',
      borderColor: APP_COLORS.GREEN,
      borderWidth: 1,
    },
    {
      label: 'Gastos',
      data: this.data().map(t => t.expense),
      backgroundColor: APP_COLORS.RED + 'b3',
      borderColor: APP_COLORS.RED,
      borderWidth: 1,
    },
  ]);
}
