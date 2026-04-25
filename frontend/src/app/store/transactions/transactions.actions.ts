import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { ITransaction } from '@models/transaction.model';

/** Campos que el usuario ingresa; txId/amountBase/createdAt/updatedAt los genera el Effect. */
export type TransactionDraft = Omit<ITransaction, 'txId' | 'amountBase' | 'createdAt' | 'updatedAt'>;

export const TransactionsActions = createActionGroup({
  source: 'Transactions',
  events: {
    'Load Transactions': emptyProps(),
    'Load Transactions Success': props<{
      transactions: ITransaction[];
      rowMap: Record<string, number>;
    }>(),
    'Load Transactions Failure': props<{ error: string }>(),

    'Add Transaction': props<{ draft: TransactionDraft; userBaseCurrency: string }>(),
    'Add Transaction Success': props<{ transaction: ITransaction }>(),
    'Add Transaction Failure': props<{ error: string; prevItems: ITransaction[] }>(),

    'Update Transaction': props<{
      transaction: ITransaction;
      rowNumber: number;
      userBaseCurrency: string;
    }>(),
    'Update Transaction Success': props<{ transaction: ITransaction }>(),
    'Update Transaction Failure': props<{ error: string; prevItems: ITransaction[] }>(),

    'Delete Transaction': props<{ txId: string; rowNumber: number }>(),
    'Delete Transaction Success': props<{ txId: string }>(),
    'Delete Transaction Failure': props<{ error: string; prevItems: ITransaction[] }>(),
  },
});
