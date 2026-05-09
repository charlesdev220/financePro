import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ICategory } from '@models/category.model';
import { CategoryService } from '@features/categories/services/category.service';
import { AppendResponse } from '@features/transactions/services/transaction.service';
import { WorkspacesStateService } from '@core/state/workspaces.state';

@Injectable({ providedIn: 'root' })
export class CategoriesStateService {
  private readonly categoryService = inject(CategoryService);
  private readonly workspacesState = inject(WorkspacesStateService);

  private readonly _allItems = signal<ICategory[]>([]);
  private readonly _loading  = signal<boolean>(false);
  private readonly _error    = signal<string | null>(null);
  private readonly _rowMap   = signal<Record<string, number>>({});
  private readonly _loaded   = signal<boolean>(false);

  /** Categorías del workspace activo. Las categorías sin workspaceId heredan el workspace default (retrocompatibilidad). */
  readonly items   = computed(() => {
    const activeId  = this.workspacesState.activeWorkspaceId();
    const defaultId = this.workspacesState.defaultWorkspaceId();
    return this._allItems().filter(c => (c.workspaceId || defaultId) === activeId);
  });
  readonly loading = this._loading.asReadonly();
  readonly error   = this._error.asReadonly();
  /** Mapa categoryId → número de fila en Sheets. */
  readonly rowMap  = this._rowMap.asReadonly();

  load(force = false): Promise<void> {
    if (this._loaded() && !force) return Promise.resolve();
    this._loading.set(true);
    this._error.set(null);
    return firstValueFrom(this.categoryService.loadCategories(this.workspacesState.defaultWorkspaceId()))
      .then(({ categories, rowMap }) => {
        this._allItems.set(categories);
        this._rowMap.set(rowMap);
        this._loaded.set(true);
      })
      .catch(err => this._error.set(String(err)))
      .finally(() => this._loading.set(false));
  }

  add(category: ICategory): void {
    const prevItems = this._allItems();
    this._allItems.update(items => [...items, category]);
    firstValueFrom(this.categoryService.saveCategory(category))
      .then((response: AppendResponse) => {
        const rowNumber = this._parseRowNumber(response?.updates?.updatedRange);
        if (rowNumber) {
          this._rowMap.update(m => ({ ...m, [category.categoryId]: rowNumber }));
        } else {
          this.load(true);
        }
      })
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }

  private _parseRowNumber(range: string | undefined): number | null {
    if (!range) return null;
    const match = range.match(/!A(\d+)/);
    return match ? Number(match[1]) : null;
  }

  update(category: ICategory, rowNumber: number): void {
    const prevItems = this._allItems();
    this._allItems.update(items => items.map(c => c.categoryId === category.categoryId ? category : c));
    firstValueFrom(this.categoryService.updateCategory(category, rowNumber))
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }

  /** Soft-delete: marca is_active = false y remueve de la lista local. */
  delete(categoryId: string, rowNumber: number): void {
    const prevItems = this._allItems();
    this._allItems.update(items => items.filter(c => c.categoryId !== categoryId));
    firstValueFrom(this.categoryService.softDeleteCategory(categoryId, rowNumber))
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }
}
