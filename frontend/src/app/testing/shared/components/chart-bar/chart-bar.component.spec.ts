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
    fixture.componentRef.setInput('datasets', sampleDatasets);
    fixture.componentRef.setInput('labels', sampleLabels);
    fixture.componentRef.setInput('type', 'bar');
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect((component as any).chart).toBeTruthy();
  });

  // REQ-05 sc2: renderiza tipo line sin errores
  it('should create a line chart when type is line', () => {
    fixture.componentRef.setInput('datasets', sampleDatasets);
    fixture.componentRef.setInput('labels', sampleLabels);
    fixture.componentRef.setInput('type', 'line');
    fixture.detectChanges();

    expect((component as any).chart).toBeTruthy();
    expect((component as any).chart.config.type).toBe('line');
  });

  // REQ-05 sc3: ngOnDestroy llama chart.destroy()
  it('calls chart.destroy() on ngOnDestroy when chart exists', () => {
    fixture.componentRef.setInput('datasets', sampleDatasets);
    fixture.componentRef.setInput('labels', sampleLabels);
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

  // REQ-05 sc4: efecto destruye y re-crea chart cuando datasets cambia
  it('destroys and re-creates chart when datasets input changes', () => {
    fixture.componentRef.setInput('datasets', sampleDatasets);
    fixture.componentRef.setInput('labels', sampleLabels);
    fixture.detectChanges();

    const destroySpy = spyOn((component as any).chart, 'destroy').and.callThrough();

    fixture.componentRef.setInput('datasets', [
      { label: 'Gastos', data: [50, 80, 120], backgroundColor: '#FF6384' },
    ]);
    fixture.detectChanges();

    expect(destroySpy).toHaveBeenCalled();
  });
});
