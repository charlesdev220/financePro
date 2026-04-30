import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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
  /** Tab de período activo recibido desde el padre (dashboard). */
  activeTab = input<PeriodTab>('month');

  /** Emite el nuevo tab seleccionado por el usuario al padre para actualizar el estado. */
  tabChange = output<PeriodTab>();

  readonly tabs = PERIOD_TABS;

  selectPeriod(tab: PeriodTab): void {
    this.tabChange.emit(tab);
  }
}
