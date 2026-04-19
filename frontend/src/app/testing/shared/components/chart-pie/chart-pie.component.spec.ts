import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chart } from 'chart.js';
import { ChartPieComponent } from '../../../../shared/components/chart-pie/chart-pie.component';

// ─────────────────────────────────────────────────────────────────────────────
// ChartPieComponent — ciclo de vida y manejo del canvas
// ─────────────────────────────────────────────────────────────────────────────
describe('ChartPieComponent', () => {
  let component: ChartPieComponent;
  let fixture: ComponentFixture<ChartPieComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartPieComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChartPieComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // REQ-05 sc3: ngOnDestroy llama chart.destroy() para liberar la instancia Chart.js
  it('calls chart.destroy() on ngOnDestroy when chart exists', () => {
    const destroySpy = spyOn(Chart.prototype, 'destroy').and.callThrough();

    fixture.componentRef.setInput('data', {
      labels: ['A', 'B'],
      datasets: [{ data: [10, 20] }],
    });
    fixture.detectChanges(); // dispara ngAfterViewInit → effect → createChart()

    component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
  });

  // REQ-05 sc3 edge: ngOnDestroy no lanza cuando chart es null
  it('does not throw on ngOnDestroy when chart is null', () => {
    fixture.detectChanges(); // data null → chart permanece null

    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  // efecto destruye y re-crea el chart cuando data cambia
  it('destroys and re-creates chart when data input changes', () => {
    fixture.componentRef.setInput('data', {
      labels: ['X'],
      datasets: [{ data: [100] }],
    });
    fixture.detectChanges();

    const destroySpy = spyOn(component['chart'] as any, 'destroy').and.callThrough();

    fixture.componentRef.setInput('data', {
      labels: ['Y', 'Z'],
      datasets: [{ data: [50, 50] }],
    });
    fixture.detectChanges();

    expect(destroySpy).toHaveBeenCalled();
  });
});
