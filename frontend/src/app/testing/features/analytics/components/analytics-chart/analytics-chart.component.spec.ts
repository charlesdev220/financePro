import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input } from '@angular/core';
import { ChartDataset } from 'chart.js';
import { AnalyticsChartComponent } from '../../../../../features/analytics/components/analytics-chart/analytics-chart.component';
import { MonthlyTotal } from '../../../../../features/analytics/services/analytics.service';

// Stub de ChartBarComponent para aislar AnalyticsChartComponent de Chart.js
@Component({
  selector: 'app-chart-bar',
  standalone: true,
  template: '<canvas></canvas>',
})
class ChartBarStubComponent {
  @Input() datasets: ChartDataset[] = [];
  @Input() labels: string[] = [];
  @Input() type: 'bar' | 'line' = 'bar';
  @Input() ariaLabel = '';
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalyticsChartComponent — REQ-06
// ─────────────────────────────────────────────────────────────────────────────
describe('AnalyticsChartComponent', () => {
  let component: AnalyticsChartComponent;
  let fixture: ComponentFixture<AnalyticsChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsChartComponent, ChartBarStubComponent],
    })
      .overrideComponent(AnalyticsChartComponent, {
        set: { imports: [ChartBarStubComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AnalyticsChartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // REQ-06 sc1: MonthlyTotal[] válido → labels con períodos y 2 datasets (income + expense)
  it('should build labels and two datasets when data is provided', () => {
    // Given
    const data: MonthlyTotal[] = [
      { period: '2026-01', income: 1000, expense: 500 },
      { period: '2026-02', income: 1200, expense: 600 },
      { period: '2026-03', income: 1500, expense: 700 },
    ];

    // When
    component.data = data;
    fixture.detectChanges();

    // Then
    expect(component.labels()).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(component.datasets().length).toBe(2);
    expect((component.datasets()[0] as any).data).toEqual([1000, 1200, 1500]);
    expect((component.datasets()[1] as any).data).toEqual([500, 600, 700]);
  });

  // REQ-06 sc2: array vacío → datasets vacíos, sin errores
  it('should render with empty datasets when data is empty array', () => {
    // Given / When
    component.data = [];
    fixture.detectChanges();

    // Then
    expect(component.labels()).toEqual([]);
    expect(() => fixture.detectChanges()).not.toThrow();
  });
});
