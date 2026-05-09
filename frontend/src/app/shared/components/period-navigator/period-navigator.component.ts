import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { IonIcon, IonInput } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, chevronBackOutline, chevronForwardOutline, closeOutline } from 'ionicons/icons';

import { PeriodTab, PERIOD_TABS } from '@core/constants/period.constants';
import { PeriodService } from '@core/services/period.service';
import { UserSettingsStateService } from '@core/state/user-settings.state';

export interface PeriodNavigatorState {
  tab: PeriodTab;
  offset: number;
  isCustomRange: boolean;
  dateRange: { from: string; to: string };
}

@Component({
  selector: 'app-period-navigator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonInput],
  templateUrl: './period-navigator.component.html',
})
export class PeriodNavigatorComponent {
  private readonly periodService = inject(PeriodService);
  private readonly userSettingsState = inject(UserSettingsStateService);

  /** Muestra el toggle y los pickers de rango personalizado. Activo en Analytics. */
  showCustomRange = input<boolean>(false);

  /** Emite el estado completo del navegador cada vez que cambia tab, offset o rango personalizado. */
  periodChange = output<PeriodNavigatorState>();

  readonly tabs = PERIOD_TABS;

  readonly activePeriodTab = signal<PeriodTab>('month');
  readonly navigationOffset = signal<number>(0);
  readonly isCustomRange = signal<boolean>(false);
  readonly customFrom = signal<string>('');
  readonly customTo = signal<string>('');

  readonly periodLabel = computed(() =>
    this.periodService.getPeriodLabel(
      this.activePeriodTab(),
      new Date(),
      this.userSettingsState.monthStartDay(),
      this.navigationOffset(),
    )
  );

  readonly canNavigateForward = computed(() => this.navigationOffset() < 0);

  readonly dateRange = computed((): { from: string; to: string } => {
    if (this.isCustomRange() && this.customFrom() && this.customTo()) {
      return { from: this.customFrom(), to: this.customTo() };
    }
    return this.periodService.getDateRange(
      this.activePeriodTab(),
      new Date(),
      this.userSettingsState.monthStartDay(),
      this.navigationOffset(),
    );
  });

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline, calendarOutline, closeOutline });
    effect(() => {
      this.periodChange.emit({
        tab: this.activePeriodTab(),
        offset: this.navigationOffset(),
        isCustomRange: this.isCustomRange(),
        dateRange: this.dateRange(),
      });
    });
  }

  onTabChange(tab: PeriodTab): void {
    this.activePeriodTab.set(tab);
    this.navigationOffset.set(0);
    this.isCustomRange.set(false);
  }

  onNavigatePrev(): void {
    this.isCustomRange.set(false);
    this.navigationOffset.update(v => v - 1);
  }

  onNavigateNext(): void {
    if (this.canNavigateForward()) {
      this.isCustomRange.set(false);
      this.navigationOffset.update(v => v + 1);
    }
  }

  onToggleCustomRange(): void {
    const next = !this.isCustomRange();
    this.isCustomRange.set(next);
    if (next) {
      const { from, to } = this.periodService.getDateRange(
        this.activePeriodTab(),
        new Date(),
        this.userSettingsState.monthStartDay(),
        this.navigationOffset(),
      );
      this.customFrom.set(from);
      this.customTo.set(to);
    }
  }

  onCustomFromChange(event: CustomEvent): void {
    this.customFrom.set(event.detail.value ?? '');
  }

  onCustomToChange(event: CustomEvent): void {
    this.customTo.set(event.detail.value ?? '');
  }
}
