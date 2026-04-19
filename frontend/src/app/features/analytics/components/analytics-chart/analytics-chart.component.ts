import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
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
  private _data = signal<MonthlyTotal[]>([]);

  @Input() set data(value: MonthlyTotal[]) {
    this._data.set(value);
  }

  readonly labels = computed(() => this._data().map(t => t.period));

  readonly datasets = computed<ChartDataset[]>(() => [
    {
      label: 'Ingresos',
      data: this._data().map(t => t.income),
      backgroundColor: 'rgba(54, 162, 235, 0.7)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    },
    {
      label: 'Gastos',
      data: this._data().map(t => t.expense),
      backgroundColor: 'rgba(255, 99, 132, 0.7)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 1,
    },
  ]);
}
