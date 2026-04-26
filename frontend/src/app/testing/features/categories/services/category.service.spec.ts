import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CategoryService } from '../../../../features/categories/services/category.service';
import { SheetsApiService } from '../../../../core/services/sheets-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MOCK_CATEGORIES } from '../../../fixtures';

// ─────────────────────────────────────────────────────────────────────────────
// CategoryService — REQ-05
// ─────────────────────────────────────────────────────────────────────────────
describe('CategoryService', () => {
  let service: CategoryService;
  let sheetsApiSpy: jasmine.SpyObj<SheetsApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  const MOCK_USER = { sub: 'usr_001', email: 'user@test.com', name: 'Test' };

  // Rows que Sheets devuelve: header + categorías del usuario + una de otro usuario
  const SHEETS_ROWS = [
    ['category_id', 'user_id', 'name', 'icon', 'color', 'type', 'budget_amount', 'budget_period', 'is_active', 'created_at'],
    [MOCK_CATEGORIES[0].categoryId, 'usr_001', 'Food', '🛒', '#4CAF50', 'expense', '', 'monthly', 'true', '2026-04-01T00:00:00.000Z'],
    ['other-cat-001', 'other-user', 'Other', '🔧', '#FF0000', 'expense', '', 'monthly', 'true', '2026-04-01T00:00:00.000Z'],
    ['inactive-cat',  'usr_001',   'Inactive', '🗑️', '#000000', 'expense', '', 'monthly', 'false', '2026-04-01T00:00:00.000Z'],
  ];

  beforeEach(() => {
    sheetsApiSpy = jasmine.createSpyObj('SheetsApiService', ['getRange', 'appendRow', 'updateRow']);
    authSpy      = jasmine.createSpyObj('AuthService', ['getUser']);

    authSpy.getUser.and.returnValue(MOCK_USER);
    sheetsApiSpy.getRange.and.returnValue(of({ range: 'CATEGORIES!A:J', majorDimension: 'ROWS' as const, values: SHEETS_ROWS }));
    sheetsApiSpy.updateRow.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        CategoryService,
        { provide: SheetsApiService, useValue: sheetsApiSpy },
        { provide: AuthService,      useValue: authSpy },
      ],
    });

    service = TestBed.inject(CategoryService);
  });

  // REQ-05 sc1 — loadCategories() devuelve solo categorías del usuario autenticado, rowMap correcto
  it('loadCategories_shouldReturnOnlyCurrentUserCategories_withCorrectRowMap', (done) => {
    service.loadCategories().subscribe(({ categories, rowMap }) => {
      // Solo las categorías de usr_001 (activas e inactivas)
      expect(categories.every(c => c.userId === 'usr_001')).toBeTrue();
      // No incluye categorías de otros usuarios
      expect(categories.some(c => c.userId === 'other-user')).toBeFalse();
      // rowMap mapea categoryId → rowNumber (fila en Sheets, 1-based + header)
      expect(rowMap[MOCK_CATEGORIES[0].categoryId]).toBe(2);
      done();
    });
  });

  // REQ-05 sc2 — softDeleteCategory() llama a SheetsApiService.updateRow con is_active = false
  it('softDeleteCategory_shouldCallUpdateRow_withIsActiveFalse', (done) => {
    const targetRow = 2;
    const existingRow = [...SHEETS_ROWS[1]];
    sheetsApiSpy.getRange.and.returnValue(of({ range: `CATEGORIES!A${targetRow}:J${targetRow}`, majorDimension: 'ROWS' as const, values: [existingRow] }));

    service.softDeleteCategory(MOCK_CATEGORIES[0].categoryId, targetRow).subscribe(() => {
      const [range, rows] = sheetsApiSpy.updateRow.calls.mostRecent().args;
      expect(range).toContain(`A${targetRow}`);
      expect(rows[0][8]).toBe(false); // col I (index 8) = is_active
      done();
    });
  });
});
