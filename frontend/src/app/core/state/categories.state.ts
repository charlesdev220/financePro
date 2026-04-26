import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ICategory } from '@models/category.model';
import { CategoryService } from '@features/categories/services/category.service';

@Injectable({ providedIn: 'root' })
export class CategoriesStateService {
  private readonly categoryService = inject(CategoryService);

  private readonly _items   = signal<ICategory[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error   = signal<string | null>(null);
  private readonly _rowMap  = signal<Record<string, number>>({});

  /** Categorías del usuario. */
  readonly items   = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error   = this._error.asReadonly();
  /** Mapa categoryId → número de fila en Sheets. */
  readonly rowMap  = this._rowMap.asReadonly();

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    firstValueFrom(this.categoryService.loadCategories())
      .then(({ categories, rowMap }) => {
        this._items.set(categories);
        this._rowMap.set(rowMap);
      })
      .catch(err => this._error.set(String(err)))
      .finally(() => this._loading.set(false));
  }

  /** Agrega categoría optimistamente y recarga para sincronizar rowMap tras el append. */
  add(category: ICategory): void {
    const prevItems = this._items();
    this._items.update(items => [...items, category]);
    firstValueFrom(this.categoryService.saveCategory(category))
      .then(() => this.load())
      .catch(err => {
        this._items.set(prevItems);
        this._error.set(String(err));
      });
  }

  update(category: ICategory, rowNumber: number): void {
    const prevItems = this._items();
    this._items.update(items => items.map(c => c.categoryId === category.categoryId ? category : c));
    firstValueFrom(this.categoryService.updateCategory(category, rowNumber))
      .catch(err => {
        this._items.set(prevItems);
        this._error.set(String(err));
      });
  }

  /** Soft-delete: marca is_active = false y remueve de la lista local. */
  delete(categoryId: string, rowNumber: number): void {
    const prevItems = this._items();
    this._items.update(items => items.filter(c => c.categoryId !== categoryId));
    firstValueFrom(this.categoryService.softDeleteCategory(categoryId, rowNumber))
      .catch(err => {
        this._items.set(prevItems);
        this._error.set(String(err));
      });
  }
}
