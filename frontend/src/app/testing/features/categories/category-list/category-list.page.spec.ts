import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { CategoryListPage } from '../../../../features/categories/category-list/category-list.page';
import { AuthService } from '../../../../core/services/auth.service';
import { IBudget } from '../../../../models/budget.model';

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function makeBudget(categoryId: string, period: string, status: IBudget['status'] = 'ok'): IBudget {
  return {
    budgetId: `b-${categoryId}-${period}`,
    userId: 'usr_001',
    categoryId,
    period,
    budgetAmount: 500,
    spentAmount: status === 'ok' ? 200 : status === 'warning' ? 430 : 550,
    status,
    lastUpdated: '2026-04-12T00:00:00Z',
  };
}

const INITIAL_STATE = {
  transactions: { items: [], rowMap: {}, loading: false, error: null },
  wallets:      { items: [], rowMap: {}, loading: false, error: null },
  categories:   { items: [], rowMap: {}, loading: false, error: null },
  budgets:      { items: [], rowMap: {}, loading: false, error: null },
  currency:     { rates: {}, loading: false, error: null },
};

const mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
const mockModal = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

// ─────────────────────────────────────────────────────────────────────────────
// CategoryListPage — getBudgetForCategory (REQ-14)
// ─────────────────────────────────────────────────────────────────────────────
describe('CategoryListPage – getBudgetForCategory (REQ-14)', () => {
  let component: CategoryListPage;
  let store: MockStore;

  // El período que usa el componente es el mes actual (igual que new Date().toISOString().slice(0,7))
  const currentPeriod = new Date().toISOString().slice(0, 7);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryListPage],
      providers: [
        provideMockStore({ initialState: INITIAL_STATE }),
        {
          provide: ModalController,
          useValue: { create: jasmine.createSpy('create').and.returnValue(Promise.resolve(mockModal)) },
        },
        {
          provide: ToastController,
          useValue: { create: jasmine.createSpy('create').and.returnValue(Promise.resolve(mockToast)) },
        },
        {
          provide: AuthService,
          useValue: { getUser: () => ({ sub: 'usr_001' }), isAuthenticated: () => true },
        },
      ],
    }).compileComponents();

    store = TestBed.inject<MockStore>(Store as any);
    const fixture = TestBed.createComponent(CategoryListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  // REQ-14 sc1: categoría expense con presupuesto para el período actual → retorna budget
  it('getBudgetForCategory_shouldReturnBudget_whenCategoryHasBudgetForCurrentPeriod', () => {
    // Given: presupuesto para 'cat-1' en el período actual
    const budget = makeBudget('cat-1', currentPeriod, 'ok');
    store.setState({ ...INITIAL_STATE, budgets: { items: [budget], rowMap: {}, loading: false, error: null } });

    // When
    const result = component.getBudgetForCategory('cat-1');

    // Then
    expect(result).toEqual(budget);
  });

  // REQ-14 sc3/sc4: sin presupuesto para esa categoría → retorna null
  it('getBudgetForCategory_shouldReturnNull_whenNoBudgetExistsForCategory', () => {
    // Given: ningún presupuesto en el store
    store.setState({ ...INITIAL_STATE, budgets: { items: [], rowMap: {}, loading: false, error: null } });

    // When
    const result = component.getBudgetForCategory('cat-999');

    // Then
    expect(result).toBeNull();
  });

  // REQ-14: presupuesto de período diferente → retorna null (no aplica al período actual)
  it('getBudgetForCategory_shouldReturnNull_whenBudgetIsForDifferentPeriod', () => {
    // Given: presupuesto para cat-1 pero de marzo, no del período actual
    const oldBudget = makeBudget('cat-1', '2026-03', 'ok');
    store.setState({ ...INITIAL_STATE, budgets: { items: [oldBudget], rowMap: {}, loading: false, error: null } });

    // When
    const result = component.getBudgetForCategory('cat-1');

    // Then: no debe mostrar el badge para un período diferente al actual
    expect(result).toBeNull();
  });

  // REQ-14: múltiples presupuestos → retorna solo el de la categoría correcta
  it('getBudgetForCategory_shouldReturnCorrectBudget_whenMultipleBudgetsExist', () => {
    // Given
    const budgetCat1 = makeBudget('cat-1', currentPeriod, 'ok');
    const budgetCat2 = makeBudget('cat-2', currentPeriod, 'warning');
    store.setState({
      ...INITIAL_STATE,
      budgets: { items: [budgetCat1, budgetCat2], rowMap: {}, loading: false, error: null },
    });

    // When
    const result = component.getBudgetForCategory('cat-2');

    // Then: retorna el presupuesto de cat-2, no el de cat-1
    expect(result).toEqual(budgetCat2);
    expect(result?.categoryId).toBe('cat-2');
  });
});
