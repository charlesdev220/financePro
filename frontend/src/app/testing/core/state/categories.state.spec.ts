import { createServiceFactory, SpectatorService, mockProvider } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { CategoriesStateService } from '@core/state/categories.state';
import { CategoryService } from '@features/categories/services/category.service';
import { AppendResponse } from '@features/transactions/services/transaction.service';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { ICategory } from '@models/category.model';

describe('CategoriesStateService', () => {
  let spectator: SpectatorService<CategoriesStateService>;
  
  // ADR-02: Signals frescos por test
  const activeWorkspaceId = signal('ws_1');
  const defaultWorkspaceId = signal('ws_default');

  const createService = createServiceFactory({
    service: CategoriesStateService,
    mocks: [CategoryService],
    providers: [
      mockProvider(WorkspacesStateService, {
        activeWorkspaceId,
        defaultWorkspaceId,
      }),
    ],
  });

  const mockCategory: ICategory = {
    categoryId: 'cat_1',
    userId: 'u1',
    name: 'Food',
    icon: '🛒',
    color: '#000',
    type: 'expense',
    budgetAmount: null,
    budgetPeriod: 'monthly',
    isActive: true,
    workspaceId: 'ws_1',
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    activeWorkspaceId.set('ws_1');
    defaultWorkspaceId.set('ws_default');
    spectator = createService();
  });

  it('should load categories and update state', async () => {
    const categories = [mockCategory];
    const rowMap = { [mockCategory.categoryId]: 2 };
    spectator.inject(CategoryService).loadCategories.mockReturnValue(of({ categories, rowMap }));

    spectator.service.load();
    expect(spectator.service.loading()).toBe(true);

    await Promise.resolve(); // Drena microtasks del firstValueFrom/then

    expect(spectator.service.items()).toEqual(categories);
    expect(spectator.service.rowMap()).toEqual(rowMap);
    expect(spectator.service.loading()).toBe(false);
  });

  it('should handle error during load', async () => {
    spectator.inject(CategoryService).loadCategories.mockReturnValue(throwError(() => 'Load error'));

    spectator.service.load();
    await Promise.resolve();

    expect(spectator.service.error()).toBe('Load error');
    expect(spectator.service.loading()).toBe(false);
  });

  it('should add category optimistically and reload', async () => {
    const newCategory = { ...mockCategory, categoryId: 'cat_new' };
    spectator.inject(CategoryService).saveCategory.mockReturnValue(of({ updates: { updatedRange: 'CATEGORIES!A10:K10' } } as AppendResponse));
    spectator.inject(CategoryService).loadCategories.mockReturnValue(of({ categories: [newCategory], rowMap: { cat_new: 3 } }));

    spectator.service.add(newCategory);
    expect(spectator.service.items()).toContain(newCategory);

    await Promise.resolve();
    expect(spectator.inject(CategoryService).loadCategories).toHaveBeenCalled();
  });

  it('should revert add on error', async () => {
    const newCategory = { ...mockCategory, categoryId: 'cat_new' };
    spectator.inject(CategoryService).saveCategory.mockReturnValue(throwError(() => 'Save error'));

    spectator.service.add(newCategory);
    await Promise.resolve();

    expect(spectator.service.items()).not.toContain(newCategory);
    expect(spectator.service.error()).toBe('Save error');
  });

  it('should update category optimistically', async () => {
    // Primero cargamos una
    spectator.inject(CategoryService).loadCategories.mockReturnValue(of({ categories: [mockCategory], rowMap: { [mockCategory.categoryId]: 2 } }));
    spectator.service.load();
    await Promise.resolve();

    const updated = { ...mockCategory, name: 'Food Updated' };
    spectator.inject(CategoryService).updateCategory.mockReturnValue(of(undefined));

    spectator.service.update(updated, 2);
    expect(spectator.service.items()[0].name).toBe('Food Updated');
  });

  it('should delete category optimistically', async () => {
    spectator.inject(CategoryService).loadCategories.mockReturnValue(of({ categories: [mockCategory], rowMap: { [mockCategory.categoryId]: 2 } }));
    spectator.service.load();
    await Promise.resolve();

    spectator.inject(CategoryService).softDeleteCategory.mockReturnValue(of(undefined));

    spectator.service.delete(mockCategory.categoryId, 2);
    expect(spectator.service.items()).toHaveLength(0);
  });

  it('should filter items by active workspace', async () => {
    const catWs1 = { ...mockCategory, categoryId: 'c1', workspaceId: 'ws_1' };
    const catWs2 = { ...mockCategory, categoryId: 'c2', workspaceId: 'ws_2' };
    
    spectator.inject(CategoryService).loadCategories.mockReturnValue(of({ 
      categories: [catWs1, catWs2], 
      rowMap: { c1: 2, c2: 3 } 
    }));
    
    spectator.service.load();
    await Promise.resolve();

    activeWorkspaceId.set('ws_1');
    expect(spectator.service.items()).toEqual([catWs1]);

    activeWorkspaceId.set('ws_2');
    expect(spectator.service.items()).toEqual([catWs2]);
  });
});
