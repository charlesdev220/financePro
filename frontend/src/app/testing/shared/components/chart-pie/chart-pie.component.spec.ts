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
    // Given: inyectamos data para que ngAfterViewInit cree el Chart
    const destroySpy = spyOn(Chart.prototype, 'destroy').and.callThrough();

    component.data = {
      labels: ['A', 'B'],
      datasets: [{ data: [10, 20] }],
    };
    fixture.detectChanges(); // dispara ngAfterViewInit → createChart()

    // When
    component.ngOnDestroy();

    // Then
    expect(destroySpy).toHaveBeenCalled();
  });

  // REQ-05 sc3 edge: ngOnDestroy no lanza cuando chart es null (componente destruido sin datos)
  it('does not throw on ngOnDestroy when chart is null', () => {
    // Given: no se setea data → chart permanece null
    fixture.detectChanges();

    // When / Then
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  // ngOnChanges destruye y re-crea el chart cuando data cambia después de inicializar
  it('calls chart.destroy() on ngOnChanges when data changes after initialization', () => {
    // Given: creamos el Chart inicial
    component.data = {
      labels: ['X'],
      datasets: [{ data: [100] }],
    };
    fixture.detectChanges(); // Ejecuta AfterViewInit: initialized = true, chart creado

    const destroySpy = spyOn(component['chart'] as any, 'destroy').and.callThrough();

    // When: cambiamos data → ngOnChanges → destroy + re-create
    // Usamos SimpleChange para simular el cambio de entrada si es necesario, 
    // pero fixture.detectChanges() debería detectarlo si la referencia cambia.
    component.data = {
      labels: ['Y', 'Z'],
      datasets: [{ data: [50, 50] }],
    };
    
    // Forzamos el trigger de cambios manualmente si detectChanges es perezoso con OnPush
    component.ngOnChanges({
      data: {
        currentValue: component.data,
        previousValue: null,
        firstChange: false,
        isFirstChange: () => false
      } as any
    });

    // Then
    expect(destroySpy).toHaveBeenCalled();
  });
});
