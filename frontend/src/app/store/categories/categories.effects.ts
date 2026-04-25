import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatMap, switchMap, map, catchError, withLatestFrom } from 'rxjs/operators';
import { of, EMPTY, merge } from 'rxjs';
import { CategoriesActions } from './categories.actions';
import { selectAllCategories } from './categories.selectors';
import { CategoryService } from '@features/categories/services/category.service';
import { Store } from '@ngrx/store';

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
      concatMap(([{ category }, prevItems]) =>
        merge(
          of(CategoriesActions.addCategorySuccess({ category })),
          categoryService.saveCategory(category).pipe(
            // Reload after append so rowMap stays in sync — prevents edit-creates-duplicate bug
            // (optimistic insert doesn't know the Sheets row number until we re-fetch)
            map(() => CategoriesActions.loadCategories()),
            catchError(error =>
              of(CategoriesActions.addCategoryFailure({ error: String(error), prevItems })),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
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
      concatMap(([{ category, rowNumber }, prevItems]) =>
        merge(
          of(CategoriesActions.updateCategorySuccess({ category })),
          categoryService.updateCategory(category, rowNumber).pipe(
            switchMap(() => EMPTY),
            catchError(error =>
              of(CategoriesActions.updateCategoryFailure({ error: String(error), prevItems })),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
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
      concatMap(([{ categoryId, rowNumber }, prevItems]) =>
        merge(
          of(CategoriesActions.deleteCategorySuccess({ categoryId })),
          categoryService.softDeleteCategory(categoryId, rowNumber).pipe(
            switchMap(() => EMPTY),
            catchError(error =>
              of(CategoriesActions.deleteCategoryFailure({ error: String(error), prevItems })),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
);
