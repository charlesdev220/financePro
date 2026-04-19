import { TestBed } from '@angular/core/testing';
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
    const fixture = TestBed.createComponent(TransactionFormComponent);
    component = fixture.componentInstance;
    // Proveer inputs requeridos antes de ngOnInit
    component.userId = 'usr_001';
    component.userBaseCurrency = 'EUR';
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
    // Given: form con tipo income y categoría
    const budget = makeBudget('cat-1', '2026-04', 500, 200, 'ok');
    store.setState({ ...INITIAL_STATE, budgets: { items: [budget], rowMap: {}, loading: false, error: null } });
    component.form.patchValue({ type: 'income', categoryId: 'cat-1', date: '2026-04-10' });

    // When / Then: income no tiene presupuesto
    expect(component.getActiveBudget()).toBeNull();
  });

  // REQ-13 sc2: expense con categoría y período que tienen presupuesto → retorna budget
  it('getActiveBudget_shouldReturnBudget_whenExpenseHasMatchingBudget', () => {
    // Given
    const budget = makeBudget('cat-1', '2026-04', 500, 200, 'ok');
    store.setState({ ...INITIAL_STATE, budgets: { items: [budget], rowMap: {}, loading: false, error: null } });
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-10' });

    // When
    const result = component.getActiveBudget();

    // Then
    expect(result).toEqual(budget);
  });

  // REQ-13 sc1 (edge): expense sin categoryId → null
  it('getActiveBudget_shouldReturnNull_whenCategoryIdIsEmpty', () => {
    // Given
    component.form.patchValue({ type: 'expense', categoryId: '', date: '2026-04-10' });

    // When / Then
    expect(component.getActiveBudget()).toBeNull();
  });

  // REQ-13 sc1 (edge): expense con categoría pero sin presupuesto → null
  it('getActiveBudget_shouldReturnNull_whenNobudgetExistsForCategory', () => {
    // Given: store sin presupuestos
    store.setState({ ...INITIAL_STATE });
    component.form.patchValue({ type: 'expense', categoryId: 'cat-sin-budget', date: '2026-04-10' });

    // When / Then
    expect(component.getActiveBudget()).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getBudgetWarning
  // ─────────────────────────────────────────────────────────────────────────

  // REQ-13 sc3: monto nuevo + spentAmount > budgetAmount → warning
  it('getBudgetWarning_shouldReturnTrue_whenProjectedSpentExceedsBudget', () => {
    // Given: ya se gastaron 400 de 500. Nuevo gasto = 200 → 400+200=600 > 500
    const budget = makeBudget('cat-1', '2026-04', 500, 400, 'warning');
    store.setState({ ...INITIAL_STATE, budgets: { items: [budget], rowMap: {}, loading: false, error: null } });
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-10', amount: 200 });

    // When / Then
    expect(component.getBudgetWarning()).toBeTrue();
  });

  // REQ-13 sc3: monto nuevo + spentAmount <= budgetAmount → sin warning
  it('getBudgetWarning_shouldReturnFalse_whenProjectedSpentIsWithinBudget', () => {
    // Given: ya se gastaron 200 de 500. Nuevo gasto = 100 → 200+100=300 < 500
    const budget = makeBudget('cat-1', '2026-04', 500, 200, 'ok');
    store.setState({ ...INITIAL_STATE, budgets: { items: [budget], rowMap: {}, loading: false, error: null } });
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-10', amount: 100 });

    // When / Then
    expect(component.getBudgetWarning()).toBeFalse();
  });

  // REQ-13 sc4: edición → resta el monto original para no contar doble
  it('getBudgetWarning_shouldAdjustProjection_whenInEditMode', () => {
    // Given: tx original era de 150. El spentAmount ya incluye esos 150.
    // Nuevo monto = 100. Proyección = 400 - 150 + 100 = 350 < 500 → sin warning
    component.transaction = makeExpenseTx(150, 'cat-1', '2026-04-05');
    const budget = makeBudget('cat-1', '2026-04', 500, 400, 'warning');
    store.setState({ ...INITIAL_STATE, budgets: { items: [budget], rowMap: {}, loading: false, error: null } });
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-05', amount: 100 });

    // When / Then: con ajuste de edición, 350 < 500 → false
    expect(component.getBudgetWarning()).toBeFalse();
  });

  // REQ-13 sc4: edición donde el monto nuevo supera incluso restando el original
  it('getBudgetWarning_shouldReturnTrue_whenEditedAmountStillExceedsBudget', () => {
    // Given: tx original 50. spentAmount 450. budgetAmount 500.
    // Proyección = 450 - 50 + 300 = 700 > 500 → warning
    component.transaction = makeExpenseTx(50, 'cat-1', '2026-04-05');
    const budget = makeBudget('cat-1', '2026-04', 500, 450, 'warning');
    store.setState({ ...INITIAL_STATE, budgets: { items: [budget], rowMap: {}, loading: false, error: null } });
    component.form.patchValue({ type: 'expense', categoryId: 'cat-1', date: '2026-04-05', amount: 300 });

    // When / Then
    expect(component.getBudgetWarning()).toBeTrue();
  });
});
