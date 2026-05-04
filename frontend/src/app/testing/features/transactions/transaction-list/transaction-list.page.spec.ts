import { createComponentFactory, Spectator, mockProvider } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { TransactionListPage } from '@features/transactions/transaction-list/transaction-list.page';
import { TransactionsStateService } from '@core/state/transactions.state';
import { WalletsStateService } from '@core/state/wallets.state';
import { CategoriesStateService } from '@core/state/categories.state';
import { CurrencyStateService } from '@core/state/currency.state';
import { AuthService } from '@core/services/auth.service';
import { ITransaction } from '@models/transaction.model';
import { IWallet } from '@models/wallet.model';
import { ICategory } from '@models/category.model';
import { ICurrency } from '@models/currency.model';
import { MODAL_CONTROLLER_MOCK, TOAST_CONTROLLER_MOCK } from '../../../ionic-mocks';

function makeTx(
  txId: string,
  userId: string,
  date: string,
  walletId: string,
  categoryId: string,
  type: 'income' | 'expense' = 'expense',
): ITransaction {
  return {
    txId,
    userId,
    walletId,
    categoryId,
    amount: 100,
    currency: 'EUR',
    amountBase: 100,
    concept: 'test',
    date,
    type,
    isRecurring: false,
    recurrenceRule: null,
    notes: null,
    workspaceId: 'ws_test',
    createdAt: `${date}T00:00:00Z`,
    updatedAt: `${date}T00:00:00Z`,
  };
}

describe('TransactionListPage', () => {
  let spectator: Spectator<TransactionListPage>;

  let txSignal: ReturnType<typeof signal<ITransaction[]>>;

  const createComponent = createComponentFactory({
    component: TransactionListPage,
    shallow: true,
    providers: [
      mockProvider(AuthService, {
        getUser: () => ({ sub: 'usr_001', email: 'test@test.com', name: 'Test' }),
        isAuthenticated: () => true
      }),
      mockProvider(ModalController, MODAL_CONTROLLER_MOCK),
      mockProvider(ToastController, TOAST_CONTROLLER_MOCK),
      mockProvider(WalletsStateService, {
        items: signal<IWallet[]>([]).asReadonly(),
      }),
      mockProvider(CategoriesStateService, {
        items: signal<ICategory[]>([]).asReadonly(),
      }),
      mockProvider(CurrencyStateService, {
        items: signal<ICurrency[]>([]).asReadonly(),
        baseCurrency: signal<string | null>('EUR').asReadonly(),
      }),
    ]
  });

  beforeEach(() => {
    txSignal = signal<ITransaction[]>([]);

    spectator = createComponent({
      providers: [
        mockProvider(TransactionsStateService, {
          items: txSignal.asReadonly(),
          error: signal<string | null>(null).asReadonly(),
          load: jest.fn(),
          add: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        })
      ]
    });
  });

  describe('filter logic (REQ-17, REQ-19)', () => {
    it('transactions_shouldReturnAllUserTransactions_whenNoFilterIsSet', () => {
      const txs = [
        makeTx('t1', 'usr_001', '2026-04-10', 'w1', 'cat-1'),
        makeTx('t2', 'usr_001', '2026-03-15', 'w1', 'cat-2'),
        makeTx('t3', 'usr_001', '2026-02-20', 'w2', 'cat-1'),
      ];
      txSignal.set(txs);

      const result = spectator.component.transactionsEnriched();
      expect(result.length).toBe(3);
    });

    it('transactions_shouldFilterByDateRange_whenFilterDateFromAndToAreSet', () => {
      const txs = [
        makeTx('t1', 'usr_001', '2026-04-10', 'w1', 'cat-1'),
        makeTx('t2', 'usr_001', '2026-03-15', 'w1', 'cat-2'),
        makeTx('t3', 'usr_001', '2026-04-25', 'w2', 'cat-2'),
      ];
      txSignal.set(txs);
      spectator.component.filterDateFrom.set('2026-04-01');
      spectator.component.filterDateTo.set('2026-04-30');

      const result = spectator.component.transactionsEnriched();
      expect(result.length).toBe(2);
    });

    it('transactions_shouldExcludeTransactionsFromOtherUsers', () => {
      const txs = [
        makeTx('t1', 'usr_001', '2026-04-10', 'w1', 'cat-1'),
        makeTx('t2', 'usr_999', '2026-04-10', 'w1', 'cat-1'),
      ];
      txSignal.set(txs);

      const result = spectator.component.transactionsEnriched();
      expect(result.length).toBe(1);
      expect(result[0].userId).toBe('usr_001');
    });
  });

  describe('openFilter panel logic (REQ-17)', () => {
    it('toggleFilter_shouldSetOpenFilter_whenCalledWithWallet', () => {
      spectator.component.toggleFilter('wallet');
      expect(spectator.component.openFilter()).toBe('wallet');
    });

    it('toggleFilter_shouldReturnOpenFilterToNull_whenCalledTwiceWithSameKey', () => {
      spectator.component.toggleFilter('wallet');
      spectator.component.toggleFilter('wallet');
      expect(spectator.component.openFilter()).toBeNull();
    });
  });

  describe('dateRangeInvalid and clearFilters (REQ-17)', () => {
    it('dateRangeInvalid_shouldBeTrue_whenFilterDateFromIsGreaterThanFilterDateTo', () => {
      spectator.component.filterDateFrom.set('2026-04-30');
      spectator.component.filterDateTo.set('2026-04-01');
      expect(spectator.component.dateRangeInvalid()).toBe(true);
    });

    it('clearFilters_shouldResetAllFiltersToDefaults_whenCalled', () => {
      spectator.component.filterWallet.set('wallet-a');
      spectator.component.filterCategory.set('cat-1');
      spectator.component.clearFilters();

      expect(spectator.component.filterWallet()).toBe('');
      expect(spectator.component.filterCategory()).toBe('');
    });
  });
});
