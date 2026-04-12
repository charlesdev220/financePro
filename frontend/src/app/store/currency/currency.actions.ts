import { createActionGroup, props } from '@ngrx/store';

export const CurrencyActions = createActionGroup({
  source: 'Currency',
  events: {
    'Load Rate': props<{ from: string; to: string }>(),
    'Load Rate Success': props<{ from: string; to: string; rate: number }>(),
    'Load Rate Failure': props<{ error: string }>(),
  },
});
