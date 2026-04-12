import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodSelectorComponent {
  @Input() period: string = currentMonth();
  @Output() periodChange = new EventEmitter<string>();

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline });
  }

  get label(): string {
    const raw = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(
      new Date(this.period + '-01'),
    );
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  previous(): void {
    this.periodChange.emit(this.shiftMonth(this.period, -1));
  }

  next(): void {
    this.periodChange.emit(this.shiftMonth(this.period, 1));
  }

  private shiftMonth(period: string, delta: number): string {
    const [year, month] = period.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
}
