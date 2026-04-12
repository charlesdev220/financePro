import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { concatMap, switchMap, map, catchError, tap, withLatestFrom } from 'rxjs/operators';
import { of, EMPTY } from 'rxjs';
import { CategoriesActions } from './categories.actions';
import { selectAllCategories } from './categories.selectors';
import { CategoryService } from '../../features/categories/services/category.service';

@Injectable()
export class CategoriesEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly categoryService = inject(CategoryService);

  loadCategories$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoriesActions.loadCategories),
      switchMap(() =>
        this.categoryService.loadCategories().pipe(
          map(({ categories, rowMap }) =>
            CategoriesActions.loadCategoriesSuccess({ categories, rowMap }),
          ),
          catchError(error =>
            of(CategoriesActions.loadCategoriesFailure({ error: String(error) })),
          ),
        ),
      ),
    ),
  );

  addCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoriesActions.addCategory),
      withLatestFrom(this.store.select(selectAllCategories)),
      concatMap(([{ category }, prevItems]) => {
        // Actualización optimista antes de Sheets
        this.store.dispatch(CategoriesActions.addCategorySuccess({ category }));
        return this.categoryService.saveCategory(category).pipe(
          catchError(error => {
            this.store.dispatch(
              CategoriesActions.addCategoryFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
    { dispatch: false },
  );

  updateCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoriesActions.updateCategory),
      withLatestFrom(this.store.select(selectAllCategories)),
      concatMap(([{ category, rowNumber }, prevItems]) => {
        this.store.dispatch(CategoriesActions.updateCategorySuccess({ category }));
        return this.categoryService.updateCategory(category, rowNumber).pipe(
          catchError(error => {
            this.store.dispatch(
              CategoriesActions.updateCategoryFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
    { dispatch: false },
  );

  deleteCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoriesActions.deleteCategory),
      withLatestFrom(this.store.select(selectAllCategories)),
      concatMap(([{ categoryId, rowNumber }, prevItems]) => {
        this.store.dispatch(CategoriesActions.deleteCategorySuccess({ categoryId }));
        return this.categoryService.softDeleteCategory(categoryId, rowNumber).pipe(
          catchError(error => {
            this.store.dispatch(
              CategoriesActions.deleteCategoryFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
    { dispatch: false },
  );
}
