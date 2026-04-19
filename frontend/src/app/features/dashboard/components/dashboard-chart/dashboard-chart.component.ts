import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartData } from 'chart.js';
import { ChartPieComponent } from '../../../../shared/components/chart-pie/chart-pie.component';
import { CategoryBreakdown } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard-chart',
  templateUrl: 'dashboard-chart.component.html',
  styleUrls: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChartPieComponent],
})
export class DashboardChartComponent {
  breakdown = input.required<CategoryBreakdown[]>();

  /** Datos formateados para Chart.js doughnut, derivados del breakdown del período activo. */
  readonly chartData = computed<ChartData<'doughnut'> | null>(() => {
    const b = this.breakdown();
    if (!b?.length) return null;
    return {
      labels:   b.map(item => item.name),
      datasets: [{ data: b.map(item => item.amount), backgroundColor: b.map(item => item.color) }],
    };
  });
}
