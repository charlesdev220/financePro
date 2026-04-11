import { TransactionsState } from './transactions/transactions.reducer';
import { WalletsState } from './wallets/wallets.reducer';
import { BudgetsState } from './budgets/budgets.reducer';

export interface AppState {
  transactions: TransactionsState;
  wallets: WalletsState;
  budgets: BudgetsState;
}
