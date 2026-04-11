import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { ITransaction } from '../../models/transaction.model';

export const TransactionsActions = createActionGroup({
  source: 'Transactions',
  events: {
    'Load Transactions': emptyProps(),
    'Load Transactions Success': props<{ transactions: ITransaction[] }>(),
    'Load Transactions Failure': props<{ error: string }>(),
  },
});
