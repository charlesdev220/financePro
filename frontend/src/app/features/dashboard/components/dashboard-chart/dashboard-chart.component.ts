import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartData } from 'chart.js';
import { ChartPieComponent } from '@shared/components/chart-pie/chart-pie.component';
import { CategoryBreakdown } from '@features/dashboard/services/dashboard.service';

import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-dashboard-chart',
  templateUrl: 'dashboard-chart.component.html',
  styleUrls: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChartPieComponent, CurrencyFormatPipe],
})
export class DashboardChartComponent {
  breakdown = input.required<CategoryBreakdown[]>();
  balance = input.required<number>();
  currency = input.required<string>();

  /** Datos formateados para Chart.js doughnut, derivados del breakdown del período activo. */
  readonly chartData = computed<ChartData<'doughnut'> | null>(() => {
    const b = this.breakdown();
    if (!b?.length) return null;
    return {
      labels:   b.map(item => item.name),
      datasets: [{ data: b.map(item => item.amount), backgroundColor: b.map(item => item.color) }],
    };
  });

  /** Breakdown enriquecido con el porcentaje de cada categoría sobre el total. */
  readonly breakdownWithPct = computed(() => {
    const b = this.breakdown();
    const total = b.reduce((sum, item) => sum + item.amount, 0);
    if (total === 0) return b.map(item => ({ ...item, pct: 0 }));
    return b.map(item => ({ ...item, pct: Math.round((item.amount / total) * 100) }));
  });
}
