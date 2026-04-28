import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActionSheetController, AlertController, ModalController, ToastController } from '@ionic/angular/standalone';
import { CategoryListPage } from '../../../../features/categories/category-list/category-list.page';
import { CategoriesStateService } from '../../../../core/state/categories.state';
import { AuthService } from '../../../../core/services/auth.service';
import { ICategory } from '../../../../models/category.model';

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function makeCategory(categoryId: string, type: 'income' | 'expense' = 'expense'): ICategory {
  return {
    categoryId,
    userId:       'usr_001',
    name:         `Cat ${categoryId}`,
    type,
    icon:         '📦',
    color:        '#5BAD8F',
    budgetAmount: null,
    budgetPeriod: 'monthly',
    isActive:     true,
    workspaceId:  'ws_test',
    createdAt:    '2026-01-01T00:00:00Z',
  };
}

const mockToast       = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
const mockModal       = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()), onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ role: 'cancel', data: null })) };
const mockActionSheet = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
const mockAlert       = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

function buildCategoriesStateMock() {
  const _items   = signal<ICategory[]>([]);
  const _loading = signal(false);
  const _error   = signal<string | null>(null);
  const _rowMap  = signal<Record<string, number>>({});
  return {
    items:   _items.asReadonly(),
    loading: _loading.asReadonly(),
    error:   _error.asReadonly(),
    rowMap:  _rowMap.asReadonly(),
    load:    jasmine.createSpy('load'),
    add:     jasmine.createSpy('add'),
    update:  jasmine.createSpy('update'),
    delete:  jasmine.createSpy('delete'),
    _items,
    _rowMap,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CategoryListPage — selection mode (REQ-17)
// ─────────────────────────────────────────────────────────────────────────────
describe('CategoryListPage – selection mode (REQ-17)', () => {
  let component: CategoryListPage;
  let categoriesStateMock: ReturnType<typeof buildCategoriesStateMock>;

  beforeEach(async () => {
    categoriesStateMock = buildCategoriesStateMock();

    await TestBed.configureTestingModule({
      imports: [CategoryListPage],
      providers: [
        { provide: CategoriesStateService, useValue: categoriesStateMock },
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

    const fixture = TestBed.createComponent(CategoryListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    mockActionSheet.present.calls.reset();
    mockAlert.present.calls.reset();
  });

  it('toggleSelection_shouldAddId_whenIdIsNotInSelectedIds', () => {
    component.toggleSelection('cat-1');
    expect(component.selectedIds().has('cat-1')).toBeTrue();
  });

  it('toggleSelection_shouldRemoveId_whenCalledTwiceWithSameId', () => {
    component.toggleSelection('cat-1');
    expect(component.selectedIds().has('cat-1')).toBeTrue();

    component.toggleSelection('cat-1');

    expect(component.selectedIds().has('cat-1')).toBeFalse();
  });

  it('selectedCount_shouldReflectSelectedIdsSize', () => {
    expect(component.selectedCount()).toBe(0);

    component.toggleSelection('cat-1');
    component.toggleSelection('cat-2');

    expect(component.selectedCount()).toBe(2);
  });

  it('toggleSelectionMode_shouldActivateSelectionMode_whenCalledWhileInactive', () => {
    expect(component.selectionMode()).toBeFalse();

    component.toggleSelectionMode();

    expect(component.selectionMode()).toBeTrue();
  });

  it('toggleSelectionMode_shouldDeactivateModeAndClearSelection_whenCalledWhileActive', () => {
    component.toggleSelectionMode();
    component.toggleSelection('cat-1');
    component.toggleSelection('cat-2');
    expect(component.selectionMode()).toBeTrue();
    expect(component.selectedIds().size).toBe(2);

    component.toggleSelectionMode();

    expect(component.selectionMode()).toBeFalse();
    expect(component.selectedIds().size).toBe(0);
  });

  it('onTilePress_shouldCallToggleSelection_whenSelectionModeIsActive', async () => {
    const cat = makeCategory('cat-1');
    component.toggleSelectionMode();
    const toggleSpy = spyOn(component, 'toggleSelection').and.callThrough();
    const actionSheetCtrl = TestBed.inject(ActionSheetController);
    const createSpy = actionSheetCtrl.create as jasmine.Spy;
    createSpy.calls.reset();

    await component.onTilePress(cat);

    expect(toggleSpy).toHaveBeenCalledWith('cat-1');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('ngOnInit_shouldCallCategoriesStateLoad', () => {
    expect(categoriesStateMock.load).toHaveBeenCalled();
  });
});
