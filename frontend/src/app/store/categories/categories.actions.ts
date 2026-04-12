import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { ICategory } from '../../models/category.model';

export const CategoriesActions = createActionGroup({
  source: 'Categories',
  events: {
    'Load Categories': emptyProps(),
    'Load Categories Success': props<{ categories: ICategory[]; rowMap: Record<string, number> }>(),
    'Load Categories Failure': props<{ error: string }>(),

    'Add Category': props<{ category: ICategory }>(),
    'Add Category Success': props<{ category: ICategory }>(),
    'Add Category Failure': props<{ error: string; prevItems: ICategory[] }>(),

    'Update Category': props<{ category: ICategory; rowNumber: number }>(),
    'Update Category Success': props<{ category: ICategory }>(),
    'Update Category Failure': props<{ error: string; prevItems: ICategory[] }>(),

    'Delete Category': props<{ categoryId: string; rowNumber: number }>(),
    'Delete Category Success': props<{ categoryId: string }>(),
    'Delete Category Failure': props<{ error: string; prevItems: ICategory[] }>(),
  },
});
