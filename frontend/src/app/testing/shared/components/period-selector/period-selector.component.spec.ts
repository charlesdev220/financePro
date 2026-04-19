import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeriodSelectorComponent } from '../../../../shared/components/period-selector/period-selector.component';

// ─────────────────────────────────────────────────────────────────────────────
// PeriodSelectorComponent — navegación de períodos mensuales
// ─────────────────────────────────────────────────────────────────────────────
describe('PeriodSelectorComponent', () => {
  let component: PeriodSelectorComponent;
  let fixture: ComponentFixture<PeriodSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeriodSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PeriodSelectorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('period', '2026-04');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // REQ-18 sc2: anterior desde 2026-04 → emite 2026-03
  it('previous_shouldEmitPreviousMonth_whenCalledFromApril2026', () => {
    // Given
    fixture.componentRef.setInput('period', '2026-04');
    fixture.detectChanges();
    const emitSpy = spyOn(component.periodChange, 'emit');

    // When
    component.previous();

    // Then
    expect(emitSpy).toHaveBeenCalledOnceWith('2026-03');
  });

  // REQ-18 sc3: siguiente desde 2026-03 → emite 2026-04
  it('next_shouldEmitNextMonth_whenCalledFromMarch2026', () => {
    // Given
    fixture.componentRef.setInput('period', '2026-03');
    fixture.detectChanges();
    const emitSpy = spyOn(component.periodChange, 'emit');

    // When
    component.next();

    // Then
    expect(emitSpy).toHaveBeenCalledOnceWith('2026-04');
  });

  // Edge: enero → atrás → diciembre del año anterior
  it('previous_shouldEmitDecemberOfPreviousYear_whenCalledFromJanuary', () => {
    // Given: 2026-01 → retroceder → 2025-12
    fixture.componentRef.setInput('period', '2026-01');
    fixture.detectChanges();
    const emitSpy = spyOn(component.periodChange, 'emit');

    // When
    component.previous();

    // Then
    expect(emitSpy).toHaveBeenCalledOnceWith('2025-12');
  });

  // Edge: diciembre → siguiente → enero del año siguiente
  it('next_shouldEmitJanuaryOfNextYear_whenCalledFromDecember', () => {
    // Given: 2025-12 → avanzar → 2026-01
    fixture.componentRef.setInput('period', '2025-12');
    fixture.detectChanges();
    const emitSpy = spyOn(component.periodChange, 'emit');

    // When
    component.next();

    // Then
    expect(emitSpy).toHaveBeenCalledOnceWith('2026-01');
  });

  // REQ-18 sc3: computed label devuelve mes en español capitalizado
  it('label_shouldReturnCapitalizedSpanishMonthName_forApril2026', () => {
    // Given
    fixture.componentRef.setInput('period', '2026-04');
    fixture.detectChanges();

    // When
    const label = component.label();

    // Then: contiene 'abril' en español, incluye el año, y empieza con mayúscula
    expect(label.toLowerCase()).toContain('abril');
    expect(label).toContain('2026');
    expect(label.charAt(0)).toBe(label.charAt(0).toUpperCase());
  });

  // REQ-18 sc3 (edge): enero → label 'Enero YYYY'
  it('label_shouldReturnCapitalizedSpanishMonthName_forJanuary', () => {
    // Given
    fixture.componentRef.setInput('period', '2026-01');
    fixture.detectChanges();

    // When
    const label = component.label();

    // Then
    expect(label.toLowerCase()).toContain('enero');
    expect(label).toContain('2026');
    expect(label.charAt(0)).toBe(label.charAt(0).toUpperCase());
  });
});
