import { TransactionsState } from './transactions/transactions.reducer';
import { WalletsState } from './wallets/wallets.reducer';
import { BudgetsState } from './budgets/budgets.reducer';
import { CategoriesState } from './categories/categories.reducer';
import { CurrencyState } from './currency/currency.reducer';

export interface AppState {
  transactions: TransactionsState;
  wallets: WalletsState;
  budgets: BudgetsState;
  categories: CategoriesState;
  currency: CurrencyState;
}
