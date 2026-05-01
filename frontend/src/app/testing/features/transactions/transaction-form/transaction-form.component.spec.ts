import { ComponentFixture, TestBed } from '@angular/core/testing';
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
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

function buildBudgetsStateMock() {
  const _items = signal<IBudget[]>([]);
  return {
    items:       _items.asReadonly(),
    loading:     signal(false).asReadonly(),
    error:       signal<string|null>(null).asReadonly(),
    rowMap:      signal<Record<string,number>>({}).asReadonly(),
    load:        jest.fn(),
    save:        jest.fn(),
    update:      jest.fn(),
    delete:      jest.fn(),
    recalculate: jest.fn(),
    _items,
  };
}

function buildTxStateMock() {
  return {
    items:   signal<ITransaction[]>([]).asReadonly(),
    loading: signal(false).asReadonly(),
    error:   signal<string|null>(null).asReadonly(),
    rowMap:  signal<Record<string,number>>({}).asReadonly(),
    load:    jest.fn(),
    add:     jest.fn(),
    update:  jest.fn(),
    delete:  jest.fn(),
  };
}

function buildWalletsStateMock() {
  return {
    items:   signal<IWallet[]>([]).asReadonly(),
    loading: signal(false).asReadonly(),
    error:   signal<string|null>(null).asReadonly(),
    rowMap:  signal<Record<string,number>>({}).asReadonly(),
    load:    jest.fn(),
    add:     jest.fn(),
    update:  jest.fn(),
    delete:  jest.fn(),
  };
}

function buildCategoriesStateMock() {
  return {
    items:   signal<ICategory[]>([]).asReadonly(),
    loading: signal(false).asReadonly(),
    error:   signal<string|null>(null).asReadonly(),
    rowMap:  signal<Record<string,number>>({}).asReadonly(),
    load:    jest.fn(),
    add:     jest.fn(),
    update:  jest.fn(),
    delete:  jest.fn(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TransactionFormComponent — getActiveBudget / getBudgetWarning (REQ-13)
// ─────────────────────────────────────────────────────────────────────────────
describe('TransactionFormComponent – budget logic (REQ-13)', () => {
  let component: TransactionFormComponent;
  let fixture: ComponentFixture<TransactionFormComponent>;
  let budgetsStateMock: ReturnType<typeof buildBudgetsStateMock>;
  let txStateMock: ReturnType<typeof buildTxStateMock>;

  beforeEach(async () => {
    budgetsStateMock = buildBudgetsStateMock();
    txStateMock = buildTxStateMock();

    await TestBed.configureTestingModule({
      imports: [TransactionFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TransactionsStateService, useValue: txStateMock },
        { provide: WalletsStateService,       useValue: buildWalletsStateMock() },
        { provide: CategoriesStateService,    useValue: buildCategoriesStateMock() },
        { provide: BudgetsStateService,       useValue: budgetsStateMock },
        {
          provide: ConceptsService,
          useValue: {
            loadConcepts:   jest.fn().mockReturnValue(of([])),
            getSuggestions: jest.fn().mockReturnValue([]),
            upsertConcept:  jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ModalController,
          useValue: {
            create:  jest.fn(),
            dismiss: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('userId', 'usr_001');
    fixture.componentRef.setInput('userBaseCurrency', 'EUR');
    fixture.detectChanges();
  });

  // REQ-13 sc1: tipo income → no hay presupuesto activo → null
  it('getActiveBudget_shouldReturnNull_whenTypeIsIncome', () => {
    const budget = makeBudget('cat-1', '2026-04', 500, 200, 'ok');
    budgetsStateMock._items.set([budget]);
    component.form.patchValue({ type: 'income', categoryId: 'cat-1', date: '2026-04-10' });

    expect(component.getActiveBudget()).toBeNull();
  });

  // REQ-13 sc2: expense con categoría y período que tienen presupuesto → retorna budget
  it('getActiveBudget_shouldReturnBudget_whenExpenseHasMatchingBudget', () => {
    const budget = makeBudget('cat-1', '2026-04', 500, 200, 'ok');
    budgetsStateMock._items.set([budget]);
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-10' });

    const result = component.getActiveBudget();

    expect(result).toEqual(budget);
  });

  // REQ-13 sc1 (edge): expense sin categoryId → null
  it('getActiveBudget_shouldReturnNull_whenCategoryIdIsEmpty', () => {
    component.form.patchValue({ type: 'expense', categoryId: '', date: '2026-04-10' });

    expect(component.getActiveBudget()).toBeNull();
  });

  // REQ-13 sc1 (edge): expense con categoría pero sin presupuesto → null
  it('getActiveBudget_shouldReturnNull_whenNoBudgetExistsForCategory', () => {
    budgetsStateMock._items.set([]);
    component.form.patchValue({ type: 'expense', categoryId: 'cat-sin-budget', date: '2026-04-10' });

    expect(component.getActiveBudget()).toBeNull();
  });

  // REQ-13 sc3: monto nuevo + spentAmount > budgetAmount → warning
  it('getBudgetWarning_shouldReturnTrue_whenProjectedSpentExceedsBudget', () => {
    const budget = makeBudget('cat-1', '2026-04', 500, 400, 'warning');
    budgetsStateMock._items.set([budget]);
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-10', amount: 200 });

    expect(component.getBudgetWarning()).toBe(true);
  });

  // REQ-13 sc3: monto nuevo + spentAmount <= budgetAmount → sin warning
  it('getBudgetWarning_shouldReturnFalse_whenProjectedSpentIsWithinBudget', () => {
    const budget = makeBudget('cat-1', '2026-04', 500, 200, 'ok');
    budgetsStateMock._items.set([budget]);
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-10', amount: 100 });

    expect(component.getBudgetWarning()).toBe(false);
  });

  // REQ-13 sc4: edición → resta el monto original para no contar doble
  it('getBudgetWarning_shouldAdjustProjection_whenInEditMode', () => {
    fixture.componentRef.setInput('transaction', makeExpenseTx(150, 'cat-1', '2026-04-05'));
    const budget = makeBudget('cat-1', '2026-04', 500, 400, 'warning');
    budgetsStateMock._items.set([budget]);
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-05', amount: 100 });

    expect(component.getBudgetWarning()).toBe(false);
  });

  // REQ-13 sc4: edición donde el monto nuevo supera incluso restando el original
  it('getBudgetWarning_shouldReturnTrue_whenEditedAmountStillExceedsBudget', () => {
    fixture.componentRef.setInput('transaction', makeExpenseTx(50, 'cat-1', '2026-04-05'));
    const budget = makeBudget('cat-1', '2026-04', 500, 450, 'warning');
    budgetsStateMock._items.set([budget]);
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-05', amount: 300 });

    expect(component.getBudgetWarning()).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TransactionFormComponent — onToggleSign / onDelete / save guard (REQ-16)
// ─────────────────────────────────────────────────────────────────────────────
describe('TransactionFormComponent – numpad sign, delete and save guard (REQ-16)', () => {
  let component: TransactionFormComponent;
  let txStateMock: ReturnType<typeof buildTxStateMock>;

  beforeEach(async () => {
    txStateMock = buildTxStateMock();

    await TestBed.configureTestingModule({
      imports: [TransactionFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TransactionsStateService, useValue: txStateMock },
        { provide: WalletsStateService,       useValue: buildWalletsStateMock() },
        { provide: CategoriesStateService,    useValue: buildCategoriesStateMock() },
        { provide: BudgetsStateService,       useValue: buildBudgetsStateMock() },
        {
          provide: ConceptsService,
          useValue: {
            loadConcepts:   jest.fn().mockReturnValue(of([])),
            getSuggestions: jest.fn().mockReturnValue([]),
            upsertConcept:  jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ModalController,
          useValue: {
            create:  jest.fn(),
            dismiss: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TransactionFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('userId', 'usr_001');
    fixture.componentRef.setInput('userBaseCurrency', 'EUR');
    fixture.detectChanges();
  });

  it('onToggleSign_shouldPrependMinus_whenAmountStringIsPositive', () => {
    component.amountString.set('150');
    component.onToggleSign();
    expect(component.amountString()).toBe('-150');
  });

  it('onToggleSign_shouldRemoveMinus_whenAmountStringIsNegative', () => {
    component.amountString.set('-150');
    component.onToggleSign();
    expect(component.amountString()).toBe('150');
  });

  it('onToggleSign_shouldNotAlterAmountString_whenValueIsZero', () => {
    component.amountString.set('0');
    component.onToggleSign();
    expect(component.amountString()).toBe('0');
  });

  it('onDelete_shouldResetToZero_whenDeletingLastDigitOfNegativeOneDigitValue', () => {
    component.amountString.set('-1');
    component.onDelete();
    expect(component.amountString()).toBe('0');
  });

  it('save_shouldNotCallTxStateAdd_whenAmountIsZero', async () => {
    component.form.patchValue({
      type: 'expense',
      amount: 0,
      currency: 'EUR',
      walletId: 'w1',
      categoryId: 'cat-1',
      date: '2026-04-10',
    });

    await component.save();

    expect(txStateMock.add).not.toHaveBeenCalled();
  });
});
