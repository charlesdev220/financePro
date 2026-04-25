import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ModalController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { TransactionFormComponent } from '../../../../features/transactions/transaction-form/transaction-form.component';
import { ConceptsService } from '../../../../features/transactions/services/concepts.service';
import { IBudget } from '../../../../models/budget.model';
import { ITransaction } from '../../../../models/transaction.model';

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
    budgetId: `b-${categoryId}`,
    userId: 'usr_001',
    categoryId,
    period,
    budgetAmount,
    spentAmount,
    status,
    lastUpdated: '2026-04-12T00:00:00Z',
  };
}

function makeExpenseTx(amount: number, categoryId: string, date: string): ITransaction {
  return {
    txId: 'tx-edit',
    userId: 'usr_001',
    walletId: 'w1',
    categoryId,
    amount,
    currency: 'EUR',
    amountBase: amount,
    concept: 'edición',
    date,
    type: 'expense',
    isRecurring: false,
    recurrenceRule: null,
    notes: null,
    createdAt: `${date}T00:00:00Z`,
    updatedAt: `${date}T00:00:00Z`,
  };
}

const INITIAL_STATE = {
  transactions: { items: [], rowMap: {}, loading: false, error: null },
  wallets:      { items: [], rowMap: {}, loading: false, error: null },
  categories:   { items: [], rowMap: {}, loading: false, error: null },
  budgets:      { items: [], rowMap: {}, loading: false, error: null },
  currency:     { rates: {}, loading: false, error: null },
};

// ─────────────────────────────────────────────────────────────────────────────
// TransactionFormComponent — getActiveBudget / getBudgetWarning (REQ-13)
// ─────────────────────────────────────────────────────────────────────────────
describe('TransactionFormComponent – budget logic (REQ-13)', () => {
  let component: TransactionFormComponent;
  let fixture: ComponentFixture<TransactionFormComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionFormComponent],
      providers: [
        provideMockStore({ initialState: INITIAL_STATE }),
        {
          provide: ModalController,
          useValue: {
            create: jasmine.createSpy('create'),
            dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve()),
          },
        },
        {
          provide: ConceptsService,
          useValue: {
            loadConcepts: () => of([]),
            getSuggestions: () => [],
            upsertConcept: async () => {},
          },
        },
      ],
    }).compileComponents();

    store = TestBed.inject<MockStore>(Store as any);
    fixture = TestBed.createComponent(TransactionFormComponent);
    component = fixture.componentInstance;
    // Proveer inputs requeridos antes de ngOnInit
    fixture.componentRef.setInput('userId', 'usr_001');
    fixture.componentRef.setInput('userBaseCurrency', 'EUR');
    fixture.detectChanges(); // trigger ngOnInit → crea el form
  });

  afterEach(() => {
    store.resetSelectors();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getActiveBudget
  // ─────────────────────────────────────────────────────────────────────────

  // REQ-13 sc1: tipo income → no hay presupuesto activo → null
  it('getActiveBudget_shouldReturnNull_whenTypeIsIncome', () => {
    const budget = makeBudget('cat-1', '2026-04', 500, 200, 'ok');
    store.setState({ ...INITIAL_STATE, budgets: { items: [budget], rowMap: {}, loading: false, error: null } });
    component.form.patchValue({ type: 'income', categoryId: 'cat-1', date: '2026-04-10' });

    expect(component.getActiveBudget()).toBeNull();
  });

  // REQ-13 sc2: expense con categoría y período que tienen presupuesto → retorna budget
  it('getActiveBudget_shouldReturnBudget_whenExpenseHasMatchingBudget', () => {
    const budget = makeBudget('cat-1', '2026-04', 500, 200, 'ok');
    store.setState({ ...INITIAL_STATE, budgets: { items: [budget], rowMap: {}, loading: false, error: null } });
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
  it('getActiveBudget_shouldReturnNull_whenNobudgetExistsForCategory', () => {
    store.setState({ ...INITIAL_STATE });
    component.form.patchValue({ type: 'expense', categoryId: 'cat-sin-budget', date: '2026-04-10' });

    expect(component.getActiveBudget()).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getBudgetWarning
  // ─────────────────────────────────────────────────────────────────────────

  // REQ-13 sc3: monto nuevo + spentAmount > budgetAmount → warning
  it('getBudgetWarning_shouldReturnTrue_whenProjectedSpentExceedsBudget', () => {
    const budget = makeBudget('cat-1', '2026-04', 500, 400, 'warning');
    store.setState({ ...INITIAL_STATE, budgets: { items: [budget], rowMap: {}, loading: false, error: null } });
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-10', amount: 200 });

    expect(component.getBudgetWarning()).toBeTrue();
  });

  // REQ-13 sc3: monto nuevo + spentAmount <= budgetAmount → sin warning
  it('getBudgetWarning_shouldReturnFalse_whenProjectedSpentIsWithinBudget', () => {
    const budget = makeBudget('cat-1', '2026-04', 500, 200, 'ok');
    store.setState({ ...INITIAL_STATE, budgets: { items: [budget], rowMap: {}, loading: false, error: null } });
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-10', amount: 100 });

    expect(component.getBudgetWarning()).toBeFalse();
  });

  // REQ-13 sc4: edición → resta el monto original para no contar doble
  it('getBudgetWarning_shouldAdjustProjection_whenInEditMode', () => {
    fixture.componentRef.setInput('transaction', makeExpenseTx(150, 'cat-1', '2026-04-05'));
    const budget = makeBudget('cat-1', '2026-04', 500, 400, 'warning');
    store.setState({ ...INITIAL_STATE, budgets: { items: [budget], rowMap: {}, loading: false, error: null } });
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-05', amount: 100 });

    expect(component.getBudgetWarning()).toBeFalse();
  });

  // REQ-13 sc4: edición donde el monto nuevo supera incluso restando el original
  it('getBudgetWarning_shouldReturnTrue_whenEditedAmountStillExceedsBudget', () => {
    fixture.componentRef.setInput('transaction', makeExpenseTx(50, 'cat-1', '2026-04-05'));
    const budget = makeBudget('cat-1', '2026-04', 500, 450, 'warning');
    store.setState({ ...INITIAL_STATE, budgets: { items: [budget], rowMap: {}, loading: false, error: null } });
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-05', amount: 300 });

    expect(component.getBudgetWarning()).toBeTrue();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TransactionFormComponent — onToggleSign / onDelete / save guard (REQ-16)
// ─────────────────────────────────────────────────────────────────────────────
describe('TransactionFormComponent – numpad sign, delete and save guard (REQ-16)', () => {
  let component: TransactionFormComponent;
  let fixture: ReturnType<typeof TestBed.createComponent<TransactionFormComponent>>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionFormComponent],
      providers: [
        provideMockStore({ initialState: INITIAL_STATE }),
        {
          provide: ModalController,
          useValue: {
            create: jasmine.createSpy('create'),
            dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve()),
          },
        },
        {
          provide: ConceptsService,
          useValue: {
            loadConcepts: () => of([]),
            getSuggestions: () => [],
            upsertConcept: async () => {},
          },
        },
      ],
    }).compileComponents();

    store = TestBed.inject<MockStore>(Store as any);
    fixture = TestBed.createComponent(TransactionFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('userId', 'usr_001');
    fixture.componentRef.setInput('userBaseCurrency', 'EUR');
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  // onToggleSign con valor positivo → agrega prefijo '-'
  it('onToggleSign_shouldPrependMinus_whenAmountStringIsPositive', () => {
    // Given
    component.amountString.set('150');

    // When
    component.onToggleSign();

    // Then
    expect(component.amountString()).toBe('-150');
  });

  // onToggleSign con valor negativo → elimina el prefijo '-'
  it('onToggleSign_shouldRemoveMinus_whenAmountStringIsNegative', () => {
    // Given
    component.amountString.set('-150');

    // When
    component.onToggleSign();

    // Then
    expect(component.amountString()).toBe('150');
  });

  // onToggleSign con '0' → no opera, permanece '0'
  it('onToggleSign_shouldNotAlterAmountString_whenValueIsZero', () => {
    // Given
    component.amountString.set('0');

    // When
    component.onToggleSign();

    // Then
    expect(component.amountString()).toBe('0');
  });

  // onDelete con '-1' → resetea a '0', no deja '-' colgado
  it('onDelete_shouldResetToZero_whenDeletingLastDigitOfNegativeOneDigitValue', () => {
    // Given
    component.amountString.set('-1');

    // When
    component.onDelete();

    // Then: '-' solo no es válido, debe quedar '0'
    expect(component.amountString()).toBe('0');
  });

  // save() no despacha ninguna acción cuando amount === 0
  it('save_shouldNotDispatchAnyAction_whenAmountIsZero', async () => {
    // Given: formulario válido pero amount = 0
    component.form.patchValue({
      type: 'expense',
      amount: 0,
      currency: 'EUR',
      walletId: 'w1',
      categoryId: 'cat-1',
      date: '2026-04-10',
    });
    const dispatchSpy = spyOn(store, 'dispatch');

    // When
    await component.save();

    // Then: el guard debe haber cortado la ejecución antes del dispatch
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
