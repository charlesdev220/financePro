import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeriodSelectorComponent } from '../../../../shared/components/period-selector/period-selector.component';

// ─────────────────────────────────────────────────────────────────────────────
// PeriodSelectorComponent — selección de períodos por tab
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

  // REQ-08 sc1 — selectPeriod('month') emite YYYY-MM
  it('selectPeriod_month_shouldEmitYYYYMM', () => {
    fixture.componentRef.setInput('period', '2026-04');
    fixture.detectChanges();
    const emitted: string[] = [];
    component.periodChange.subscribe((v: string) => emitted.push(v));

    component.selectPeriod('month');

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toMatch(/^\d{4}-\d{2}$/);
  });

  // REQ-08 sc1 — selectPeriod('day') emite YYYY-MM-DD
  it('selectPeriod_day_shouldEmitYYYYMMDD', () => {
    fixture.componentRef.setInput('period', '2026-04-26');
    fixture.detectChanges();
    const emitted: string[] = [];
    component.periodChange.subscribe((v: string) => emitted.push(v));

    component.selectPeriod('day');

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // REQ-08 sc1 — activeTab es 'month' cuando period es 'YYYY-MM'
  it('activeTab_shouldBeMonth_whenPeriodIsYYYYMM', () => {
    fixture.componentRef.setInput('period', '2026-04');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('month');
  });

  // REQ-08 sc1 — activeTab es 'week' cuando period contiene 'W'
  it('activeTab_shouldBeWeek_whenPeriodContainsW', () => {
    fixture.componentRef.setInput('period', '2026-W17');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('week');
  });

  // activeTab es 'day' cuando period tiene longitud 10 (YYYY-MM-DD)
  it('activeTab_shouldBeDay_whenPeriodIsFullDate', () => {
    fixture.componentRef.setInput('period', '2026-04-26');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('day');
  });

  // activeTab es 'year' cuando period tiene longitud 4 (YYYY)
  it('activeTab_shouldBeYear_whenPeriodIsYYYY', () => {
    fixture.componentRef.setInput('period', '2026');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('year');
  });
});
