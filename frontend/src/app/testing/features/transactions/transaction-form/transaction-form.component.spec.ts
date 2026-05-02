import { createComponentFactory, Spectator, mockProvider } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ModalController } from '@ionic/angular/standalone';
import { TransactionFormComponent } from '../../../../features/transactions/transaction-form/transaction-form.component';
import { TransactionsStateService } from '../../../../core/state/transactions.state';
import { WalletsStateService } from '../../../../core/state/wallets.state';
import { CategoriesStateService } from '../../../../core/state/categories.state';
import { BudgetsStateService } from '../../../../core/state/budgets.state';
import { ConceptsService } from '../../../../features/transactions/services/concepts.service';
import { IBudget } from '../../../../models/budget.model';
import { ITransaction } from '../../../../models/transaction.model';
import { IWallet } from '../../../../models/wallet.model';
import { ICategory } from '../../../../models/category.model';
import { MODAL_CONTROLLER_MOCK } from '../../../ionic-mocks';

function makeBudget(
  categoryId: string,
  period: string,
  budgetAmount: number,
  spentAmount: number,
  status: IBudget['status'],
): IBudget {
  return {
    budgetId:    `b-${categoryId}`,
    userId:      'usr_001',
    categoryId,
    period,
    budgetAmount,
    spentAmount,
    status,
    lastUpdated:  '2026-04-12T00:00:00Z',
    workspaceId:  'ws_test',
    mode:         'indefinite' as const,
  };
}

function makeExpenseTx(amount: number, categoryId: string, date: string): ITransaction {
  return {
    txId:           'tx-edit',
    userId:         'usr_001',
    walletId:       'w1',
    categoryId,
    amount,
    currency:       'EUR',
    amountBase:     amount,
    concept:        'edición',
    date,
    type:           'expense',
    isRecurring:    false,
    recurrenceRule: null,
    notes:          null,
    workspaceId:    'ws_test',
    createdAt:      `${date}T00:00:00Z`,
    updatedAt:      `${date}T00:00:00Z`,
  };
}

describe('TransactionFormComponent', () => {
  let spectator: Spectator<TransactionFormComponent>;
  
  let budgetsSignal: ReturnType<typeof signal<IBudget[]>>;
  let txSignal: ReturnType<typeof signal<ITransaction[]>>;

  const createComponent = createComponentFactory({
    component: TransactionFormComponent,
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      mockProvider(WalletsStateService, {
        items: signal<IWallet[]>([]).asReadonly(),
      }),
      mockProvider(CategoriesStateService, {
        items: signal<ICategory[]>([]).asReadonly(),
      }),
      mockProvider(ConceptsService, {
        loadConcepts: jest.fn().mockReturnValue(of([])),
        getSuggestions: jest.fn().mockReturnValue([]),
        upsertConcept: jest.fn().mockResolvedValue(undefined),
      }),
      mockProvider(ModalController, MODAL_CONTROLLER_MOCK),
    ]
  });

  beforeEach(() => {
    budgetsSignal = signal<IBudget[]>([]);
    txSignal = signal<ITransaction[]>([]);

    spectator = createComponent({
      props: {
        userId: 'usr_001',
        userBaseCurrency: 'EUR'
      },
      providers: [
        mockProvider(BudgetsStateService, {
          items: budgetsSignal.asReadonly(),
        }),
        mockProvider(TransactionsStateService, {
          items: txSignal.asReadonly(),
          add: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        })
      ]
    });
  });

  describe('budget logic (REQ-13)', () => {
    it('getActiveBudget_shouldReturnNull_whenTypeIsIncome', () => {
      const budget = makeBudget('cat-1', '2026-04', 500, 200, 'ok');
      budgetsSignal.set([budget]);
      spectator.component.form.patchValue({ type: 'income', categoryId: 'cat-1', date: '2026-04-10' });

      expect(spectator.component.getActiveBudget()).toBeNull();
    });

    it('getActiveBudget_shouldReturnBudget_whenExpenseHasMatchingBudget', () => {
      const budget = makeBudget('cat-1', '2026-04', 500, 200, 'ok');
      budgetsSignal.set([budget]);
      spectator.component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-10' });

      expect(spectator.component.getActiveBudget()).toEqual(budget);
    });

    it('getBudgetWarning_shouldReturnTrue_whenProjectedSpentExceedsBudget', () => {
      const budget = makeBudget('cat-1', '2026-04', 500, 400, 'warning');
      budgetsSignal.set([budget]);
      spectator.component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-10', amount: 200 });

      expect(spectator.component.getBudgetWarning()).toBe(true);
    });

    it('getBudgetWarning_shouldAdjustProjection_whenInEditMode', () => {
      spectator.setInput('transaction', makeExpenseTx(150, 'cat-1', '2026-04-05'));
      const budget = makeBudget('cat-1', '2026-04', 500, 400, 'warning');
      budgetsSignal.set([budget]);
      spectator.component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-05', amount: 100 });

      expect(spectator.component.getBudgetWarning()).toBe(false);
    });
  });

  describe('numpad sign, delete and save guard (REQ-16)', () => {
    it('onToggleSign_shouldPrependMinus_whenAmountStringIsPositive', () => {
      spectator.component.amountString.set('150');
      spectator.component.onToggleSign();
      expect(spectator.component.amountString()).toBe('-150');
    });

    it('onDelete_shouldResetToZero_whenDeletingLastDigitOfNegativeOneDigitValue', () => {
      spectator.component.amountString.set('-1');
      spectator.component.onDelete();
      expect(spectator.component.amountString()).toBe('0');
    });

    it('save_shouldNotCallTxStateAdd_whenAmountIsZero', async () => {
      spectator.component.form.patchValue({
        type: 'expense',
        amount: 0,
        currency: 'EUR',
        walletId: 'w1',
        categoryId: 'cat-1',
        date: '2026-04-10',
      });

      await spectator.component.save();

      expect(spectator.inject(TransactionsStateService).add).not.toHaveBeenCalled();
    });
  });
});
