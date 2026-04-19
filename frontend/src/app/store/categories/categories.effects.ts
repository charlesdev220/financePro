import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { concatMap, switchMap, map, catchError, withLatestFrom } from 'rxjs/operators';
import { of, EMPTY } from 'rxjs';
import { CategoriesActions } from './categories.actions';
import { selectAllCategories } from './categories.selectors';
import { CategoryService } from '../../features/categories/services/category.service';

export const loadCategories$ = createEffect(
  (
    actions$ = inject(Actions),
    categoryService = inject(CategoryService),
  ) =>
    actions$.pipe(
      ofType(CategoriesActions.loadCategories),
      switchMap(() =>
        categoryService.loadCategories().pipe(
          map(({ categories, rowMap }) =>
            CategoriesActions.loadCategoriesSuccess({ categories, rowMap }),
          ),
          catchError(error =>
            of(CategoriesActions.loadCategoriesFailure({ error: String(error) })),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const addCategory$ = createEffect(
  (
    actions$ = inject(Actions),
    categoryService = inject(CategoryService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(CategoriesActions.addCategory),
      withLatestFrom(store.select(selectAllCategories)),
      concatMap(([{ category }, prevItems]) => {
        store.dispatch(CategoriesActions.addCategorySuccess({ category }));
        return categoryService.saveCategory(category).pipe(
          catchError(error => {
            store.dispatch(
              CategoriesActions.addCategoryFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
  { functional: true, dispatch: false },
);

export const updateCategory$ = createEffect(
  (
    actions$ = inject(Actions),
    categoryService = inject(CategoryService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(CategoriesActions.updateCategory),
      withLatestFrom(store.select(selectAllCategories)),
      concatMap(([{ category, rowNumber }, prevItems]) => {
        store.dispatch(CategoriesActions.updateCategorySuccess({ category }));
        return categoryService.updateCategory(category, rowNumber).pipe(
          catchError(error => {
            store.dispatch(
              CategoriesActions.updateCategoryFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
  { functional: true, dispatch: false },
);

export const deleteCategory$ = createEffect(
  (
    actions$ = inject(Actions),
    categoryService = inject(CategoryService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(CategoriesActions.deleteCategory),
      withLatestFrom(store.select(selectAllCategories)),
      concatMap(([{ categoryId, rowNumber }, prevItems]) => {
        store.dispatch(CategoriesActions.deleteCategorySuccess({ categoryId }));
        return categoryService.softDeleteCategory(categoryId, rowNumber).pipe(
          catchError(error => {
            store.dispatch(
              CategoriesActions.deleteCategoryFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
  { functional: true, dispatch: false },
);
