import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input } from '@angular/core';
import { ChartDataset } from 'chart.js';
import { By } from '@angular/platform-browser';
import { ProjectionsComponent } from '../../../../../features/analytics/components/projections/projections.component';
import { MonthlyTotal } from '../../../../../features/analytics/services/analytics.service';

// Stub de ChartBarComponent
@Component({
  selector: 'app-chart-bar',
  standalone: true,
  template: '<canvas aria-label="stub"></canvas>',
})
class ChartBarStubComponent {
  datasets  = input<ChartDataset[]>([]);
  labels    = input<string[]>([]);
  type      = input<'bar' | 'line'>('bar');
  ariaLabel = input('');
}

function buildMonthlyTotals(count: number): MonthlyTotal[] {
  return Array.from({ length: count }, (_, i) => ({
    period:  `2026-${String(i + 1).padStart(2, '0')}`,
    income:  1000 + i * 100,
    expense: 500 + i * 50,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// ProjectionsComponent — REQ-07
// ─────────────────────────────────────────────────────────────────────────────
describe('ProjectionsComponent', () => {
  let component: ProjectionsComponent;
  let fixture: ComponentFixture<ProjectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectionsComponent, ChartBarStubComponent],
    })
      .overrideComponent(ProjectionsComponent, {
        set: { imports: [ChartBarStubComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProjectionsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // REQ-07 sc1: < 3 meses → mensaje visible, canvas oculto
  it('should show informative message when data has fewer than 3 months', () => {
    // Given
    fixture.componentRef.setInput('data', buildMonthlyTotals(2));
    fixture.detectChanges();

    // Then
    const msg = fixture.debugElement.query(By.css('.no-data-msg'));
    const canvas = fixture.debugElement.query(By.css('app-chart-bar'));
    expect(msg).toBeTruthy();
    expect(msg.nativeElement.textContent).toContain('Se necesitan al menos 3 meses de datos para proyectar');
    expect(canvas).toBeNull();
  });

  // REQ-07 sc2: exactamente 3 meses → canvas visible, sin mensaje
  it('should show chart when data has exactly 3 months', () => {
    // Given
    fixture.componentRef.setInput('data', buildMonthlyTotals(3));
    fixture.detectChanges();

    // Then
    const canvas = fixture.debugElement.query(By.css('app-chart-bar'));
    const msg    = fixture.debugElement.query(By.css('.no-data-msg'));
    expect(canvas).toBeTruthy();
    expect(msg).toBeNull();
  });

  // REQ-07 sc3: ≥ 3 meses con horizon=6 → labels incluye 6 períodos proyectados
  it('should include projected periods in labels when horizon is 6', () => {
    // Given
    fixture.componentRef.setInput('data', buildMonthlyTotals(4));
    fixture.componentRef.setInput('horizon', 6);
    fixture.detectChanges();

    // Then: labels = 4 históricos + 6 proyectados = 10
    expect(component.labels().length).toBe(10);
  });

  // hasEnoughData getter
  it('hasEnoughData should be false when data length < 3', () => {
    fixture.componentRef.setInput('data', buildMonthlyTotals(2));
    fixture.detectChanges();
    expect(component.hasEnoughData()).toBe(false);
  });

  it('hasEnoughData should be true when data length >= 3', () => {
    fixture.componentRef.setInput('data', buildMonthlyTotals(3));
    fixture.detectChanges();
    expect(component.hasEnoughData()).toBe(true);
  });
});
