import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

type PeriodTab = 'day' | 'week' | 'month' | 'year';

const TABS: { id: PeriodTab; label: string }[] = [
  { id: 'day',   label: 'Día' },
  { id: 'week',  label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year',  label: 'Año' },
];

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

@Component({
  selector: 'app-period-selector',
  standalone: true,
  imports: [],
  templateUrl: './period-selector.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodSelectorComponent {
  period       = input<string>(currentMonth());
  periodChange = output<string>();

  readonly tabs = TABS;

  /** Tab activo inferido del formato del período recibido por input. */
  readonly activeTab = computed((): PeriodTab => {
    const p = this.period();
    if (!p) return 'month';
    if (p.includes('W')) return 'week';
    if (p.length === 4) return 'year';
    if (p.length === 10) return 'day';
    return 'month';
  });

  selectPeriod(tab: PeriodTab): void {
    const now = new Date();
    let value: string;
    switch (tab) {
      case 'day':   value = now.toISOString().slice(0, 10); break;
      case 'week':  value = isoWeek(now); break;
      case 'year':  value = String(now.getFullYear()); break;
      default:      value = now.toISOString().slice(0, 7);
    }
    this.periodChange.emit(value);
  }
}
