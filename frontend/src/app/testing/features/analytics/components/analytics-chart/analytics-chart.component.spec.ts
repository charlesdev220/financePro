import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ChartDataset } from 'chart.js';
import { AnalyticsChartComponent } from '@features/analytics/components/analytics-chart/analytics-chart.component';
import { MonthlyTotal } from '@features/analytics/services/analytics.service';

describe('AnalyticsChartComponent', () => {
  let spectator: Spectator<AnalyticsChartComponent>;

  const createComponent = createComponentFactory({
    component: AnalyticsChartComponent,
    shallow: true, // Evita instanciar ChartBarComponent real
  });

  beforeEach(() => {
    spectator = createComponent({ props: { data: [] } });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  // REQ-06 sc1: MonthlyTotal[] válido → labels con períodos y 2 datasets (income + expense)
  it('should build labels and two datasets when data is provided', () => {
    const data: MonthlyTotal[] = [
      { period: '2026-01', income: 1000, expense: 500 },
      { period: '2026-02', income: 1200, expense: 600 },
      { period: '2026-03', income: 1500, expense: 700 },
    ];

    spectator.setInput('data', data);

    expect(spectator.component.labels()).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(spectator.component.datasets().length).toBe(2);
    expect((spectator.component.datasets()[0] as ChartDataset).data).toEqual([1000, 1200, 1500]);
    expect((spectator.component.datasets()[1] as ChartDataset).data).toEqual([500, 600, 700]);
  });

  // REQ-06 sc2: array vacío → datasets vacíos, sin errores
  it('should render with empty datasets when data is empty array', () => {
    spectator.setInput('data', []);
    expect(spectator.component.labels()).toEqual([]);
  });
});
