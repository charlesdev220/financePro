import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CategoriesState } from './categories.reducer';

export const selectCategoriesState =
  createFeatureSelector<CategoriesState>('categories');

export const selectAllCategories = createSelector(
  selectCategoriesState,
  state => state.items,
);

export const selectActiveCategories = createSelector(selectAllCategories, cats =>
  cats.filter(c => c.isActive),
);

export const selectByType = (type: 'income' | 'expense') =>
  createSelector(selectActiveCategories, cats => cats.filter(c => c.type === type));

export const selectCategoryById = (id: string) =>
  createSelector(selectAllCategories, cats => cats.find(c => c.categoryId === id) ?? null);

export const selectCategoriesRowMap = createSelector(
  selectCategoriesState,
  state => state.rowMap,
);

export const selectCategoriesLoading = createSelector(
  selectCategoriesState,
  state => state.loading,
);

export const selectCategoriesError = createSelector(
  selectCategoriesState,
  state => state.error,
);
