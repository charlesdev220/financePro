import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { ChartData } from 'chart.js';
import { ChartPieComponent } from '../../../../shared/components/chart-pie/chart-pie.component';
import { CategoryBreakdown } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard-chart',
  templateUrl: 'dashboard-chart.component.html',
  styleUrls: ['dashboard-chart.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChartPieComponent],
})
export class DashboardChartComponent implements OnChanges {
  @Input({ required: true }) breakdown!: CategoryBreakdown[];

  chartData: ChartData<'doughnut'> | null = null;

  ngOnChanges(): void {
    this.chartData = this.toChartData();
  }

  private toChartData(): ChartData<'doughnut'> | null {
    if (!this.breakdown?.length) return null;
    return {
      labels: this.breakdown.map(b => b.name),
      datasets: [
        {
          data: this.breakdown.map(b => b.amount),
          backgroundColor: this.breakdown.map(b => b.color),
        },
      ],
    };
  }
}
