import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { PeriodTab, PERIOD_TABS } from '@core/constants/period.constants';

@Component({
  selector: 'app-period-selector',
  standalone: true,
  imports: [],
  templateUrl: './period-selector.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodSelectorComponent {
  /** Tab de período activo — two-way binding con el padre vía [(activeTab)]. */
  activeTab = model<PeriodTab>('month');

  readonly tabs = PERIOD_TABS;

  onTabSelect(tab: PeriodTab): void {
    this.activeTab.set(tab);
  }
}
