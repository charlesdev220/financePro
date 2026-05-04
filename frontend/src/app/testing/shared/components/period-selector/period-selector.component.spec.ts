import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { PeriodSelectorComponent } from '@shared/components/period-selector/period-selector.component';
import { PeriodTab } from '@core/constants/period.constants';

describe('PeriodSelectorComponent', () => {
  let spectator: Spectator<PeriodSelectorComponent>;
  const createComponent = createComponentFactory({
    component: PeriodSelectorComponent,
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  // sc1 — activeTab por defecto es 'month'
  it('activeTab_defaultShouldBeMonth', () => {
    expect(spectator.component.activeTab()).toBe('month');
  });

  // sc2 — activeTab refleja el valor del input del padre
  it('activeTab_shouldReflectInputValue', () => {
    spectator.setInput('activeTab', 'week');
    expect(spectator.component.activeTab()).toBe('week');
  });

  // sc3 — selectPeriod('day') emite tabChange con 'day'
  it('selectPeriod_shouldEmitTabChange_forDay', () => {
    let emitted: PeriodTab | undefined;
    spectator.component.tabChange.subscribe((v: PeriodTab) => emitted = v);

    spectator.component.selectPeriod('day');

    expect(emitted).toBe('day');
  });

  // sc4 — selectPeriod emite el tab correcto para cada uno de los 4 tipos
  it('selectPeriod_shouldEmitCorrectTab_forAllTypes', () => {
    const tabs: PeriodTab[] = ['day', 'week', 'month', 'year'];

    tabs.forEach(tab => {
      let emitted: PeriodTab | undefined;
      spectator.component.tabChange.subscribe((v: PeriodTab) => emitted = v);
      spectator.component.selectPeriod(tab);
      expect(emitted).toBe(tab);
    });
  });

  // sc5 — tabs expone los 4 períodos esperados
  it('tabs_shouldContainAll4PeriodIds', () => {
    expect(spectator.component.tabs.length).toBe(4);
    const ids = spectator.component.tabs.map(t => t.id);
    expect(ids).toContain('day');
    expect(ids).toContain('week');
    expect(ids).toContain('month');
    expect(ids).toContain('year');
  });
});
