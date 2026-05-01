import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeriodSelectorComponent } from '../../../../shared/components/period-selector/period-selector.component';
import { PeriodTab } from '../../../../core/constants/period.constants';

// ─────────────────────────────────────────────────────────────────────────────
// PeriodSelectorComponent — selección de períodos por tab (API v2: activeTab + tabChange)
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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // sc1 — activeTab por defecto es 'month'
  it('activeTab_defaultShouldBeMonth', () => {
    expect(component.activeTab()).toBe('month');
  });

  // sc2 — activeTab refleja el valor del input del padre
  it('activeTab_shouldReflectInputValue', () => {
    fixture.componentRef.setInput('activeTab', 'week');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('week');
  });

  // sc3 — selectPeriod('day') emite tabChange con 'day'
  it('selectPeriod_shouldEmitTabChange_forDay', () => {
    const emitted: PeriodTab[] = [];
    component.tabChange.subscribe((v: PeriodTab) => emitted.push(v));

    component.selectPeriod('day');

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toBe('day');
  });

  // sc4 — selectPeriod emite el tab correcto para cada uno de los 4 tipos
  it('selectPeriod_shouldEmitCorrectTab_forAllTypes', () => {
    const tabs: PeriodTab[] = ['day', 'week', 'month', 'year'];

    tabs.forEach(tab => {
      const emitted: PeriodTab[] = [];
      component.tabChange.subscribe((v: PeriodTab) => emitted.push(v));
      component.selectPeriod(tab);
      expect(emitted[emitted.length - 1]).toBe(tab);
    });
  });

  // sc5 — tabs expone los 4 períodos esperados
  it('tabs_shouldContainAll4PeriodIds', () => {
    expect(component.tabs.length).toBe(4);
    const ids = component.tabs.map(t => t.id);
    expect(ids).toContain('day');
    expect(ids).toContain('week');
    expect(ids).toContain('month');
    expect(ids).toContain('year');
  });
});
