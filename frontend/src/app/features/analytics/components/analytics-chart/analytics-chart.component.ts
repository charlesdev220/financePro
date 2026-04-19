import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartDataset } from 'chart.js';
import { ChartBarComponent } from '../../../../shared/components/chart-bar/chart-bar.component';
import { MonthlyTotal } from '../../services/analytics.service';

@Component({
  selector: 'app-analytics-chart',
  standalone: true,
  imports: [ChartBarComponent],
  templateUrl: './analytics-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsChartComponent {
  data = input<MonthlyTotal[]>([]);

  /** Períodos del eje X derivados de los datos históricos recibidos del padre. */
  readonly labels = computed(() => this.data().map(t => t.period));

  /** Datasets de ingresos y gastos para Chart.js, derivados de los datos históricos. */
  readonly datasets = computed<ChartDataset[]>(() => [
    {
      label: 'Ingresos',
      data: this.data().map(t => t.income),
      backgroundColor: 'rgba(54, 162, 235, 0.7)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    },
    {
      label: 'Gastos',
      data: this.data().map(t => t.expense),
      backgroundColor: 'rgba(255, 99, 132, 0.7)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 1,
    },
  ]);
}
