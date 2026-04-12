import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IBudget } from '../../models/budget.model';

export const BudgetsActions = createActionGroup({
  source: 'Budgets',
  events: {
    'Load Budgets': emptyProps(),
    'Load Budgets Success': props<{ budgets: IBudget[]; rowMap: Record<string, number> }>(),
    'Load Budgets Failure': props<{ error: string }>(),

    'Save Budget': props<{ budget: IBudget }>(),
    'Save Budget Success': props<{ budget: IBudget }>(),
    'Save Budget Failure': props<{ error: string; prevItems: IBudget[] }>(),

    'Delete Budget': props<{ budgetId: string; rowNumber: number }>(),
    'Delete Budget Success': props<{ budgetId: string }>(),
    'Delete Budget Failure': props<{ error: string; prevItems: IBudget[] }>(),

    'Update Budget': props<{ budget: IBudget; rowNumber: number }>(),
    'Update Budget Success': props<{ budget: IBudget }>(),
    'Update Budget Failure': props<{ error: string; prevItems: IBudget[] }>(),

    'Recalculate Budget': props<{ categoryId: string; period: string }>(),
    'Recalculate Budget Success': props<{ budget: IBudget }>(),
    'Recalculate Budget Failure': props<{ error: string }>(),
  },
});
