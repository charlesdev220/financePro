import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { Chart } from 'chart.js';
import { ChartBarComponent } from '@shared/components/chart-bar/chart-bar.component';

describe('ChartBarComponent', () => {
  let spectator: Spectator<ChartBarComponent>;
  const sampleDatasets = [
    { label: 'Ingresos', data: [100, 200, 300], backgroundColor: '#36A2EB' },
  ];
  const sampleLabels = ['2026-01', '2026-02', '2026-03'];

  const createComponent = createComponentFactory({
    component: ChartBarComponent,
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  // REQ-05 sc1: renderiza tipo bar sin errores
  it('should create a bar chart when type is bar', () => {
    spectator.setInput('datasets', sampleDatasets);
    spectator.setInput('labels', sampleLabels);
    spectator.setInput('type', 'bar');

    expect(spectator.component).toBeTruthy();
    expect((spectator.component as any).chart).toBeTruthy();
  });

  // REQ-05 sc2: renderiza tipo line sin errores
  it('should create a line chart when type is line', () => {
    spectator.setInput('datasets', sampleDatasets);
    spectator.setInput('labels', sampleLabels);
    spectator.setInput('type', 'line');

    expect((spectator.component as any).chart).toBeTruthy();
    expect((spectator.component as any).chart.config.type).toBe('line');
  });

  // REQ-05 sc3: ngOnDestroy llama chart.destroy()
  it('calls chart.destroy() on ngOnDestroy when chart exists', () => {
    spectator.setInput('datasets', sampleDatasets);
    spectator.setInput('labels', sampleLabels);

    const destroySpy = jest.spyOn((spectator.component as any).chart as Chart, 'destroy');

    spectator.component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
  });

  // REQ-05 sc3 edge: ngOnDestroy no lanza cuando chart es null
  it('does not throw on ngOnDestroy when chart is null', () => {
    // datasets vacíos → no crea chart
    expect(() => spectator.component.ngOnDestroy()).not.toThrow();
  });

  // REQ-05 sc4: efecto destruye y re-crea chart cuando datasets cambia
  it('destroys and re-creates chart when datasets input changes', () => {
    spectator.setInput('datasets', sampleDatasets);
    spectator.setInput('labels', sampleLabels);

    const destroySpy = jest.spyOn((spectator.component as any).chart as Chart, 'destroy');

    spectator.setInput('datasets', [
      { label: 'Gastos', data: [50, 80, 120], backgroundColor: '#FF6384' },
    ]);

    expect(destroySpy).toHaveBeenCalled();
  });
});
