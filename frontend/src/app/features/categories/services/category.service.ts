import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { SheetsApiService } from '../../../core/services/sheets-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ICategory } from '../../../models/category.model';

// CATEGORIES schema (A:I — 9 columnas)
// A: category_id | B: user_id | C: name | D: icon | E: color | F: type
// G: budget_amount | H: budget_period | I: is_active

export function rowToCategory(row: unknown[]): ICategory {
  const budgetRaw = row[6];
  return {
    categoryId:   String(row[0] ?? ''),
    userId:       String(row[1] ?? ''),
    name:         String(row[2] ?? ''),
    icon:         String(row[3] ?? '📂'),
    color:        String(row[4] ?? '#9E9E9E'),
    type:         (String(row[5] ?? 'expense') as 'income' | 'expense'),
    budgetAmount: budgetRaw ? Number(budgetRaw) : null,
    budgetPeriod: (String(row[7] ?? 'monthly') as 'monthly' | 'weekly' | 'custom'),
    isActive:     String(row[8] ?? 'true') === 'true' || row[8] === true,
    createdAt:    String(row[9] ?? new Date().toISOString()),
  };
}

export function categoryToRow(cat: ICategory): unknown[] {
  return [
    cat.categoryId,
    cat.userId,
    cat.name,
    cat.icon,
    cat.color,
    cat.type,
    cat.budgetAmount ?? '',
    cat.budgetPeriod,
    cat.isActive,
    cat.createdAt,
  ];
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly sheetsApi = inject(SheetsApiService);
  private readonly authService = inject(AuthService);

  loadCategories(): Observable<{ categories: ICategory[]; rowMap: Record<string, number> }> {
    return this.sheetsApi.getRange('CATEGORIES!A:J').pipe(
      map(response => {
        if (!response?.values || response.values.length < 2) {
          return { categories: [], rowMap: {} };
        }
        const allRows = response.values.slice(1);
        const userId = this.authService.getUser()?.sub ?? '';
        const rowMap: Record<string, number> = {};
        allRows.forEach((row, i) => {
          const id = String(row[0] ?? '');
          const uid = String(row[1] ?? '');
          if (id && uid === userId) rowMap[id] = i + 2;
        });
        const categories = allRows
          .filter(row => row[0] && String(row[1] ?? '') === userId)
          .map(rowToCategory);
        return { categories, rowMap };
      }),
    );
  }

  saveCategory(category: ICategory): Observable<unknown> {
    return this.sheetsApi.appendRow('CATEGORIES!A1', [categoryToRow(category)]);
  }

  updateCategory(category: ICategory, rowNumber: number): Observable<unknown> {
    return this.sheetsApi.updateRow(
      `CATEGORIES!A${rowNumber}:J${rowNumber}`,
      [categoryToRow(category)],
    );
  }

  /** Soft delete: marca is_active = false. Nunca borra la fila (protege FKs). */
  softDeleteCategory(categoryId: string, rowNumber: number): Observable<unknown> {
    return this.sheetsApi.getRange(`CATEGORIES!A${rowNumber}:J${rowNumber}`).pipe(
      switchMap(response => {
        const row = response?.values?.[0];
        if (!row) throw new Error(`Row ${rowNumber} not found in CATEGORIES`);
        const updated = [...row];
        updated[8] = false; // col I: is_active
        return this.sheetsApi.updateRow(`CATEGORIES!A${rowNumber}:J${rowNumber}`, [updated]);
      }),
    );
  }
}
