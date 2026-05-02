import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ProjectionsComponent } from '../../../../../features/analytics/components/projections/projections.component';
import { MonthlyTotal } from '../../../../../features/analytics/services/analytics.service';

function buildMonthlyTotals(count: number): MonthlyTotal[] {
  return Array.from({ length: count }, (_, i) => ({
    period:  `2026-${String(i + 1).padStart(2, '0')}`,
    income:  1000 + i * 100,
    expense: 500 + i * 50,
  }));
}

describe('ProjectionsComponent', () => {
  let spectator: Spectator<ProjectionsComponent>;

  const createComponent = createComponentFactory({
    component: ProjectionsComponent,
    shallow: true,
  });

  beforeEach(() => {
    spectator = createComponent({ props: { data: [] } });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  // REQ-07 sc1: < 3 meses → mensaje visible, canvas oculto
  it('should show informative message when data has fewer than 3 months', () => {
    spectator.setInput('data', buildMonthlyTotals(2));

    const canvas = spectator.query('app-chart-bar');
    expect(canvas).toBeNull();
    
    const hostText = spectator.element.textContent;
    expect(hostText).toContain('3 meses');
  });

  // REQ-07 sc2: exactamente 3 meses → canvas visible, sin mensaje
  it('should show chart when data has exactly 3 months', () => {
    spectator.setInput('data', buildMonthlyTotals(3));

    const canvas = spectator.query('app-chart-bar');
    const msg    = spectator.query('.no-data-msg');
    expect(canvas).toBeTruthy();
    expect(msg).toBeNull();
  });

  // REQ-07 sc3: ≥ 3 meses con horizon=6 → labels incluye 6 períodos proyectados
  it('should include projected periods in labels when horizon is 6', () => {
    spectator.setInput('data', buildMonthlyTotals(4));
    spectator.setInput('horizon', 6);

    // labels = 4 históricos + 6 proyectados = 10
    expect(spectator.component.labels().length).toBe(10);
  });

  // hasEnoughData getter
  it('hasEnoughData should be false when data length < 3', () => {
    spectator.setInput('data', buildMonthlyTotals(2));
    expect(spectator.component.hasEnoughData()).toBe(false);
  });

  it('hasEnoughData should be true when data length >= 3', () => {
    spectator.setInput('data', buildMonthlyTotals(3));
    expect(spectator.component.hasEnoughData()).toBe(true);
  });
});
