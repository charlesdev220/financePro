import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ActionSheetController, AlertController, ModalController, ToastController } from '@ionic/angular/standalone';
import { CategoryListPage } from '../../../../features/categories/category-list/category-list.page';
import { AuthService } from '../../../../core/services/auth.service';
import { ICategory } from '../../../../models/category.model';

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function makeCategory(categoryId: string, type: 'income' | 'expense' = 'expense'): ICategory {
  return {
    categoryId,
    userId: 'usr_001',
    name: `Cat ${categoryId}`,
    type,
    icon: '📦',
    color: '#5BAD8F',
    budgetAmount: null,
    budgetPeriod: 'monthly',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

const INITIAL_STATE = {
  transactions: { items: [], rowMap: {}, loading: false, error: null },
  wallets:      { items: [], rowMap: {}, loading: false, error: null },
  categories:   { items: [], rowMap: {}, loading: false, error: null },
  budgets:      { items: [], rowMap: {}, loading: false, error: null },
  currency:     { rates: {}, loading: false, error: null },
};

const mockToast       = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
const mockModal       = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()), onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ role: 'cancel', data: null })) };
const mockActionSheet = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
const mockAlert       = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

// ─────────────────────────────────────────────────────────────────────────────
// CategoryListPage — selection mode (REQ-17)
// ─────────────────────────────────────────────────────────────────────────────
describe('CategoryListPage – selection mode (REQ-17)', () => {
  let component: CategoryListPage;
  let store: MockStore;

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
          provide: ActionSheetController,
          useValue: { create: jasmine.createSpy('create').and.returnValue(Promise.resolve(mockActionSheet)) },
        },
        {
          provide: AlertController,
          useValue: { create: jasmine.createSpy('create').and.returnValue(Promise.resolve(mockAlert)) },
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
    mockActionSheet.present.calls.reset();
    mockAlert.present.calls.reset();
  });

  // toggleSelection agrega el id al Set
  it('toggleSelection_shouldAddId_whenIdIsNotInSelectedIds', () => {
    // When
    component.toggleSelection('cat-1');

    // Then
    expect(component.selectedIds().has('cat-1')).toBeTrue();
  });

  // toggleSelection llamado dos veces → quita el id
  it('toggleSelection_shouldRemoveId_whenCalledTwiceWithSameId', () => {
    // Given
    component.toggleSelection('cat-1');
    expect(component.selectedIds().has('cat-1')).toBeTrue();

    // When
    component.toggleSelection('cat-1');

    // Then
    expect(component.selectedIds().has('cat-1')).toBeFalse();
  });

  // selectedCount refleja el tamaño del Set
  it('selectedCount_shouldReflectSelectedIdsSize', () => {
    // Given: inicialmente vacío
    expect(component.selectedCount()).toBe(0);

    // When
    component.toggleSelection('cat-1');
    component.toggleSelection('cat-2');

    // Then
    expect(component.selectedCount()).toBe(2);
  });

  // toggleSelectionMode activa el modo selección
  it('toggleSelectionMode_shouldActivateSelectionMode_whenCalledWhileInactive', () => {
    // Given
    expect(component.selectionMode()).toBeFalse();

    // When
    component.toggleSelectionMode();

    // Then
    expect(component.selectionMode()).toBeTrue();
  });

  // toggleSelectionMode desactiva el modo y limpia la selección
  it('toggleSelectionMode_shouldDeactivateModeAndClearSelection_whenCalledWhileActive', () => {
    // Given: modo activo con categorías seleccionadas
    component.toggleSelectionMode(); // activar
    component.toggleSelection('cat-1');
    component.toggleSelection('cat-2');
    expect(component.selectionMode()).toBeTrue();
    expect(component.selectedIds().size).toBe(2);

    // When
    component.toggleSelectionMode(); // desactivar

    // Then
    expect(component.selectionMode()).toBeFalse();
    expect(component.selectedIds().size).toBe(0);
  });

  // onTilePress en modo selección → llama toggleSelection, no abre action sheet
  it('onTilePress_shouldCallToggleSelection_whenSelectionModeIsActive', async () => {
    // Given
    const cat = makeCategory('cat-1');
    component.toggleSelectionMode(); // activar modo selección
    const toggleSpy = spyOn(component, 'toggleSelection').and.callThrough();
    const actionSheetCtrl = TestBed.inject(ActionSheetController);
    const createSpy = actionSheetCtrl.create as jasmine.Spy;
    createSpy.calls.reset();

    // When
    await component.onTilePress(cat);

    // Then: toggleSelection fue invocado con el id correcto
    expect(toggleSpy).toHaveBeenCalledWith('cat-1');
    // Y el action sheet NO fue creado
    expect(createSpy).not.toHaveBeenCalled();
  });
});
