import { createComponentFactory, Spectator, mockProvider } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { ActionSheetController, AlertController, ModalController, ToastController } from '@ionic/angular/standalone';
import { CategoryListPage } from '@features/categories/category-list/category-list.page';
import { CategoriesStateService } from '@core/state/categories.state';
import { AuthService } from '@core/services/auth.service';
import { ICategory } from '@models/category.model';
import { MODAL_CONTROLLER_MOCK, TOAST_CONTROLLER_MOCK, ALERT_CONTROLLER_MOCK } from '../../../ionic-mocks';

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
    workspaceId: 'ws_test',
    createdAt: '2026-01-01T00:00:00Z',
  };
}

describe('CategoryListPage', () => {
  let spectator: Spectator<CategoryListPage>;

  // Patrón ADR-02: Signals frescos por test
  let itemsSignal: ReturnType<typeof signal<ICategory[]>>;
  let loadingSignal: ReturnType<typeof signal<boolean>>;
  let errorSignal: ReturnType<typeof signal<string | null>>;
  let rowMapSignal: ReturnType<typeof signal<Record<string, number>>>;

  const createComponent = createComponentFactory({
    component: CategoryListPage,
    providers: [
      mockProvider(AuthService, {
        getUser: () => ({ sub: 'usr_001' }),
        isAuthenticated: () => true
      }),
      mockProvider(ModalController, MODAL_CONTROLLER_MOCK),
      mockProvider(ToastController, TOAST_CONTROLLER_MOCK),
      mockProvider(AlertController, ALERT_CONTROLLER_MOCK),
      mockProvider(ActionSheetController, {
        create: jest.fn().mockResolvedValue({ present: jest.fn().mockResolvedValue(undefined) })
      }),
    ]
  });

  beforeEach(() => {
    itemsSignal = signal<ICategory[]>([]);
    loadingSignal = signal(false);
    errorSignal = signal<string | null>(null);
    rowMapSignal = signal<Record<string, number>>({});

    spectator = createComponent({
      providers: [
        mockProvider(CategoriesStateService, {
          items: itemsSignal.asReadonly(),
          loading: loadingSignal.asReadonly(),
          error: errorSignal.asReadonly(),
          rowMap: rowMapSignal.asReadonly(),
          load: jest.fn(),
          add: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        })
      ]
    });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('toggleSelection_shouldAddId_whenIdIsNotInSelectedIds', () => {
    spectator.component.toggleSelection('cat-1');
    expect(spectator.component.selectedIds().has('cat-1')).toBe(true);
  });

  it('toggleSelection_shouldRemoveId_whenCalledTwiceWithSameId', () => {
    spectator.component.toggleSelection('cat-1');
    expect(spectator.component.selectedIds().has('cat-1')).toBe(true);
    spectator.component.toggleSelection('cat-1');
    expect(spectator.component.selectedIds().has('cat-1')).toBe(false);
  });

  it('selectedCount_shouldReflectSelectedIdsSize', () => {
    expect(spectator.component.selectedCount()).toBe(0);
    spectator.component.toggleSelection('cat-1');
    spectator.component.toggleSelection('cat-2');
    expect(spectator.component.selectedCount()).toBe(2);
  });

  it('toggleSelectionMode_shouldActivateSelectionMode_whenCalledWhileInactive', () => {
    expect(spectator.component.selectionMode()).toBe(false);
    spectator.component.toggleSelectionMode();
    expect(spectator.component.selectionMode()).toBe(true);
  });

  it('toggleSelectionMode_shouldDeactivateModeAndClearSelection_whenCalledWhileActive', () => {
    spectator.component.toggleSelectionMode();
    spectator.component.toggleSelection('cat-1');
    spectator.component.toggleSelection('cat-2');
    expect(spectator.component.selectionMode()).toBe(true);
    expect(spectator.component.selectedIds().size).toBe(2);

    spectator.component.toggleSelectionMode();

    expect(spectator.component.selectionMode()).toBe(false);
    expect(spectator.component.selectedIds().size).toBe(0);
  });

  it('onTilePress_shouldCallToggleSelection_whenSelectionModeIsActive', async () => {
    const cat = makeCategory('cat-1');
    spectator.component.toggleSelectionMode();
    const toggleSpy = jest.spyOn(spectator.component, 'toggleSelection');

    await spectator.component.onTilePress(cat);

    expect(toggleSpy).toHaveBeenCalledWith('cat-1');
    expect(spectator.inject(ActionSheetController).create).not.toHaveBeenCalled();
  });

  it('ngOnInit_shouldCallCategoriesStateLoad', () => {
    expect(spectator.inject(CategoriesStateService).load).toHaveBeenCalled();
  });
});
