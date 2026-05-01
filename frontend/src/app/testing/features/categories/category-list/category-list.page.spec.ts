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

const mockToast = {
  present: jest.fn().mockResolvedValue(undefined),
};
const mockModal = {
  present:        jest.fn().mockResolvedValue(undefined),
  onWillDismiss:  jest.fn().mockResolvedValue({ role: 'cancel', data: null }),
};
const mockActionSheet = { present: jest.fn().mockResolvedValue(undefined) };
const mockAlert       = { present: jest.fn().mockResolvedValue(undefined) };

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
    load:    jest.fn(),
    add:     jest.fn(),
    update:  jest.fn(),
    delete:  jest.fn(),
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
    mockActionSheet.present.mockClear();
    mockAlert.present.mockClear();

    await TestBed.configureTestingModule({
      imports: [CategoryListPage],
      providers: [
        { provide: CategoriesStateService, useValue: categoriesStateMock },
        {
          provide: ModalController,
          useValue: { create: jest.fn().mockResolvedValue(mockModal) },
        },
        {
          provide: ToastController,
          useValue: { create: jest.fn().mockResolvedValue(mockToast) },
        },
        {
          provide: ActionSheetController,
          useValue: { create: jest.fn().mockResolvedValue(mockActionSheet) },
        },
        {
          provide: AlertController,
          useValue: { create: jest.fn().mockResolvedValue(mockAlert) },
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

  it('toggleSelection_shouldAddId_whenIdIsNotInSelectedIds', () => {
    component.toggleSelection('cat-1');
    expect(component.selectedIds().has('cat-1')).toBe(true);
  });

  it('toggleSelection_shouldRemoveId_whenCalledTwiceWithSameId', () => {
    component.toggleSelection('cat-1');
    expect(component.selectedIds().has('cat-1')).toBe(true);

    component.toggleSelection('cat-1');

    expect(component.selectedIds().has('cat-1')).toBe(false);
  });

  it('selectedCount_shouldReflectSelectedIdsSize', () => {
    expect(component.selectedCount()).toBe(0);

    component.toggleSelection('cat-1');
    component.toggleSelection('cat-2');

    expect(component.selectedCount()).toBe(2);
  });

  it('toggleSelectionMode_shouldActivateSelectionMode_whenCalledWhileInactive', () => {
    expect(component.selectionMode()).toBe(false);

    component.toggleSelectionMode();

    expect(component.selectionMode()).toBe(true);
  });

  it('toggleSelectionMode_shouldDeactivateModeAndClearSelection_whenCalledWhileActive', () => {
    component.toggleSelectionMode();
    component.toggleSelection('cat-1');
    component.toggleSelection('cat-2');
    expect(component.selectionMode()).toBe(true);
    expect(component.selectedIds().size).toBe(2);

    component.toggleSelectionMode();

    expect(component.selectionMode()).toBe(false);
    expect(component.selectedIds().size).toBe(0);
  });

  it('onTilePress_shouldCallToggleSelection_whenSelectionModeIsActive', async () => {
    const cat = makeCategory('cat-1');
    component.toggleSelectionMode();
    const toggleSpy = jest.spyOn(component, 'toggleSelection');
    const actionSheetCtrl = TestBed.inject(ActionSheetController);
    const createMock = actionSheetCtrl.create as jest.Mock;
    createMock.mockClear();

    await component.onTilePress(cat);

    expect(toggleSpy).toHaveBeenCalledWith('cat-1');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('ngOnInit_shouldCallCategoriesStateLoad', () => {
    expect(categoriesStateMock.load).toHaveBeenCalled();
  });
});
