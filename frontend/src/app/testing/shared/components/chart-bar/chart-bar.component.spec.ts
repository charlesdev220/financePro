import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chart } from 'chart.js';
import { ChartBarComponent } from '../../../../shared/components/chart-bar/chart-bar.component';

// ─────────────────────────────────────────────────────────────────────────────
// ChartBarComponent — ciclo de vida y manejo del canvas
// ─────────────────────────────────────────────────────────────────────────────
describe('ChartBarComponent', () => {
  let component: ChartBarComponent;
  let fixture: ComponentFixture<ChartBarComponent>;

  const sampleDatasets = [
    { label: 'Ingresos', data: [100, 200, 300], backgroundColor: '#36A2EB' },
  ];
  const sampleLabels = ['2026-01', '2026-02', '2026-03'];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChartBarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // REQ-05 sc1: renderiza tipo bar sin errores
  it('should create a bar chart when type is bar', () => {
    component.datasets = sampleDatasets as any;
    component.labels   = sampleLabels;
    component.type     = 'bar';

    const createSpy = spyOn(Chart.prototype, 'constructor' as any).and.callThrough();
    fixture.detectChanges(); // dispara ngAfterViewInit

    expect(component).toBeTruthy();
    // El chart privado debe existir
    expect((component as any).chart).toBeTruthy();
  });

  // REQ-05 sc2: renderiza tipo line sin errores
  it('should create a line chart when type is line', () => {
    component.datasets = sampleDatasets as any;
    component.labels   = sampleLabels;
    component.type     = 'line';
    fixture.detectChanges();

    expect((component as any).chart).toBeTruthy();
    expect((component as any).chart.config.type).toBe('line');
  });

  // REQ-05 sc3: ngOnDestroy llama chart.destroy()
  it('calls chart.destroy() on ngOnDestroy when chart exists', () => {
    component.datasets = sampleDatasets as any;
    component.labels   = sampleLabels;
    fixture.detectChanges();

    const destroySpy = spyOn((component as any).chart, 'destroy').and.callThrough();

    component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
  });

  // REQ-05 sc3 edge: ngOnDestroy no lanza cuando chart es null
  it('does not throw on ngOnDestroy when chart is null', () => {
    fixture.detectChanges(); // datasets vacíos → no crea chart

    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  // REQ-05 sc4: ngOnChanges destruye y re-crea chart cuando datasets cambia
  it('calls chart.destroy() on ngOnChanges when datasets change after initialization', () => {
    component.datasets = sampleDatasets as any;
    component.labels   = sampleLabels;
    fixture.detectChanges();

    const destroySpy = spyOn((component as any).chart, 'destroy').and.callThrough();

    component.datasets = [
      { label: 'Gastos', data: [50, 80, 120], backgroundColor: '#FF6384' },
    ] as any;

    component.ngOnChanges({
      datasets: {
        currentValue: component.datasets,
        previousValue: sampleDatasets,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(destroySpy).toHaveBeenCalled();
  });
});
