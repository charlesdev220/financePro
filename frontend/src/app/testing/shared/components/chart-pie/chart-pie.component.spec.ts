import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { Chart } from 'chart.js';
import { ChartPieComponent } from '../../../../shared/components/chart-pie/chart-pie.component';

describe('ChartPieComponent', () => {
  let spectator: Spectator<ChartPieComponent>;

  const createComponent = createComponentFactory({
    component: ChartPieComponent,
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  // REQ-05 sc3: ngOnDestroy llama chart.destroy() para liberar la instancia Chart.js
  it('calls chart.destroy() on ngOnDestroy when chart exists', () => {
    jest.useFakeTimers();

    spectator.setInput('data', {
      labels: ['A', 'B'],
      datasets: [{ data: [10, 20] }],
    });
    // effect → setTimeout(100)
    jest.runAllTimers();     // avanza el timeout → createChart() ejecuta

    const destroySpy = jest.spyOn((spectator.component as any).chart as Chart, 'destroy');

    spectator.component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
  });

  // REQ-05 sc3 edge: ngOnDestroy no lanza cuando chart es null
  it('does not throw on ngOnDestroy when chart is null', () => {
    // data null → chart permanece null
    expect(() => spectator.component.ngOnDestroy()).not.toThrow();
  });

  // efecto destruye y re-crea el chart cuando data cambia
  it('destroys and re-creates chart when data input changes', () => {
    jest.useFakeTimers();

    spectator.setInput('data', {
      labels: ['X'],
      datasets: [{ data: [100] }],
    });
    jest.runAllTimers(); // primer chart creado

    const destroySpy = jest.spyOn((spectator.component as any).chart as Chart, 'destroy');

    spectator.setInput('data', {
      labels: ['Y', 'Z'],
      datasets: [{ data: [50, 50] }],
    });
    // effect: destroy → setTimeout para el nuevo chart

    expect(destroySpy).toHaveBeenCalled();
  });
});
