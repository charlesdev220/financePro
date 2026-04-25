import { createReducer, on } from '@ngrx/store';
import { ICategory } from '@models/category.model';
import { CategoriesActions } from './categories.actions';

export interface CategoriesState {
  items: ICategory[];
  rowMap: Record<string, number>; // categoryId → Sheets row number (1-based, header = row 1)
  loading: boolean;
  error: string | null;
}

const initialState: CategoriesState = {
  items: [],
  rowMap: {},
  loading: false,
  error: null,
};

export const categoriesReducer = createReducer(
  initialState,

  // Load
  on(CategoriesActions.loadCategories, state => ({ ...state, loading: true, error: null })),
  on(CategoriesActions.loadCategoriesSuccess, (state, { categories, rowMap }) => ({
    ...state,
    items: categories,
    rowMap,
    loading: false,
  })),
  on(CategoriesActions.loadCategoriesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Add (optimistic)
  on(CategoriesActions.addCategory, state => ({ ...state, loading: true })),
  on(CategoriesActions.addCategorySuccess, (state, { category }) => ({
    ...state,
    items: [...state.items, category],
    loading: false,
  })),
  on(CategoriesActions.addCategoryFailure, (state, { error, prevItems }) => ({
    ...state,
    items: prevItems,
    loading: false,
    error,
  })),

  // Update (optimistic)
  on(CategoriesActions.updateCategorySuccess, (state, { category }) => ({
    ...state,
    items: state.items.map(c => (c.categoryId === category.categoryId ? category : c)),
  })),
  on(CategoriesActions.updateCategoryFailure, (state, { error, prevItems }) => ({
    ...state,
    items: prevItems,
    error,
  })),

  // Delete / soft-delete (optimistic: mark inactive)
  on(CategoriesActions.deleteCategorySuccess, (state, { categoryId }) => ({
    ...state,
    items: state.items.map(c =>
      c.categoryId === categoryId ? { ...c, isActive: false } : c,
    ),
  })),
  on(CategoriesActions.deleteCategoryFailure, (state, { error, prevItems }) => ({
    ...state,
    items: prevItems,
    error,
  })),
);
