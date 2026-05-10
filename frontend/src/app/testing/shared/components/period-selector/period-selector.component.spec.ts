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

  // sc3 — onTabSelect('day') actualiza activeTab y emite activeTabChange con 'day'
  it('onTabSelect_shouldUpdateModel_forDay', () => {
    let emitted: PeriodTab | undefined;
    spectator.component.activeTab.subscribe((v: PeriodTab) => emitted = v);

    spectator.component.onTabSelect('day');

    expect(spectator.component.activeTab()).toBe('day');
    expect(emitted).toBe('day');
  });

  // sc4 — onTabSelect actualiza el model correctamente para cada uno de los 4 tipos
  it('onTabSelect_shouldUpdateModel_forAllTypes', () => {
    const tabs: PeriodTab[] = ['day', 'week', 'month', 'year'];

    tabs.forEach(tab => {
      spectator.component.onTabSelect(tab);
      expect(spectator.component.activeTab()).toBe(tab);
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
