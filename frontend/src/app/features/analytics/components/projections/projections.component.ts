import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { ChartDataset } from 'chart.js';
import { ChartBarComponent } from '../../../../shared/components/chart-bar/chart-bar.component';
import { AnalyticsService, MonthlyTotal } from '../../services/analytics.service';

@Component({
  selector: 'app-projections',
  standalone: true,
  imports: [ChartBarComponent],
  templateUrl: './projections.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectionsComponent {
  private readonly analyticsService = inject(AnalyticsService);

  private _data = signal<MonthlyTotal[]>([]);
  private _horizon = signal<3 | 6 | 12>(3);

  @Input() set data(value: MonthlyTotal[]) {
    this._data.set(value);
  }

  @Input() set horizon(value: 3 | 6 | 12) {
    this._horizon.set(value);
  }

  readonly hasEnoughData = computed(() => this._data().length >= 3);

  readonly labels = computed(() => {
    const data = this._data();
    const horizon = this._horizon();
    const historical = data.map(t => t.period);
    const projected = this.buildProjectedPeriods(data, horizon);
    return [...historical, ...projected];
  });

  readonly datasets = computed<ChartDataset[]>(() => {
    const data = this._data();
    const horizon = this._horizon();

    const points = data.map((t, i) => ({ x: i, y: t.expense }));
    const { slope, intercept } = this.analyticsService.linearRegression(points);

    const historicalExpense = data.map(t => t.expense);
    const projectedExpense  = Array.from({ length: horizon }, (_, i) => {
      const x = data.length + i;
      return Math.max(0, Math.round((slope * x + intercept) * 100) / 100);
    });

    return [
      {
        label: 'Gasto histórico',
        data: [...historicalExpense, ...Array(horizon).fill(null)],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.3,
      },
      {
        label: 'Proyección',
        data: [...Array(data.length).fill(null), ...projectedExpense],
        borderColor: 'rgba(255, 165, 0, 1)',
        backgroundColor: 'rgba(255, 165, 0, 0.2)',
        borderDash: [5, 5],
        tension: 0.3,
      },
    ];
  });

  private buildProjectedPeriods(data: MonthlyTotal[], horizon: number): string[] {
    if (!data.length) return [];
    const last = data[data.length - 1].period;
    const [year, month] = last.split('-').map(Number);
    return Array.from({ length: horizon }, (_, i) => {
      const date = new Date(year, month + i, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });
  }
}
