export type PeriodTab = 'day' | 'week' | 'month' | 'year';

export const PERIOD_TABS: { id: PeriodTab; label: string }[] = [
  { id: 'day',   label: 'Día' },
  { id: 'week',  label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year',  label: 'Año' },
];
