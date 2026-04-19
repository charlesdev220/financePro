import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

@Component({
  selector: 'app-period-selector',
  standalone: true,
  imports: [IonButton, IonIcon],
  templateUrl: './period-selector.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodSelectorComponent {
  period       = input<string>(currentMonth());
  periodChange = output<string>();

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline });
  }

  /** Etiqueta localizada del período actual (mes + año en español capitalizado). */
  readonly label = computed(() => {
    const raw = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(
      new Date(this.period() + '-01'),
    );
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  });

  previous(): void {
    this.periodChange.emit(this.shiftMonth(this.period(), -1));
  }

  next(): void {
    this.periodChange.emit(this.shiftMonth(this.period(), 1));
  }

  private shiftMonth(period: string, delta: number): string {
    const [year, month] = period.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
