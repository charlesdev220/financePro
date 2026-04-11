import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IBudget } from '../../models/budget.model';

export const BudgetsActions = createActionGroup({
  source: 'Budgets',
  events: {
    'Load Budgets': emptyProps(),
    'Load Budgets Success': props<{ budgets: IBudget[] }>(),
    'Load Budgets Failure': props<{ error: string }>(),
  },
});
