import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { CategoryService } from '../../../../features/categories/services/category.service';
import { SheetsApiService } from '../../../../core/services/sheets-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MOCK_CATEGORIES } from '../../../fixtures';

// ─────────────────────────────────────────────────────────────────────────────
// CategoryService — REQ-05
// ─────────────────────────────────────────────────────────────────────────────
describe('CategoryService', () => {
  let service: CategoryService;
  let sheetsApiSpy: jest.Mocked<Pick<SheetsApiService, 'getRange' | 'appendRow' | 'updateRow'>>;
  let authSpy: jest.Mocked<Pick<AuthService, 'getUser'>>;

  const MOCK_USER = { sub: 'usr_001', email: 'user@test.com', name: 'Test' };

  const SHEETS_ROWS = [
    ['category_id', 'user_id', 'name', 'icon', 'color', 'type', 'budget_amount', 'budget_period', 'is_active', 'created_at'],
    [MOCK_CATEGORIES[0].categoryId, 'usr_001', 'Food', '🛒', '#4CAF50', 'expense', '', 'monthly', 'true', '2026-04-01T00:00:00.000Z'],
    ['other-cat-001', 'other-user', 'Other', '🔧', '#FF0000', 'expense', '', 'monthly', 'true', '2026-04-01T00:00:00.000Z'],
    ['inactive-cat',  'usr_001',   'Inactive', '🗑️', '#000000', 'expense', '', 'monthly', 'false', '2026-04-01T00:00:00.000Z'],
  ];

  beforeEach(() => {
    sheetsApiSpy = {
      getRange:  jest.fn(),
      appendRow: jest.fn(),
      updateRow: jest.fn(),
    };
    authSpy = { getUser: jest.fn() };

    authSpy.getUser.mockReturnValue(MOCK_USER);
    sheetsApiSpy.getRange.mockReturnValue(
      of({ range: 'CATEGORIES!A:J', majorDimension: 'ROWS' as const, values: SHEETS_ROWS }),
    );
    sheetsApiSpy.updateRow.mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        CategoryService,
        { provide: SheetsApiService, useValue: sheetsApiSpy },
        { provide: AuthService,      useValue: authSpy },
      ],
    });

    service = TestBed.inject(CategoryService);
  });

  // REQ-05 sc1 — loadCategories() devuelve todas las categorías de la hoja con rowMap correcto
  // Nota: el servicio no filtra por userId (la hoja pertenece al usuario autenticado);
  // el filtrado por workspace/userId se hace en la capa de estado (state).
  it('loadCategories_shouldReturnAllCategories_withCorrectRowMap', async () => {
    const { categories, rowMap } = await firstValueFrom(service.loadCategories());

    // Todas las filas con id válido deben ser devueltas (3 filas de datos)
    expect(categories.length).toBe(3);
    // rowMap mapea categoryId → número de fila (header=1, datos desde fila 2)
    expect(rowMap[MOCK_CATEGORIES[0].categoryId]).toBe(2);
  });

  // REQ-05 sc2 — softDeleteCategory() llama a SheetsApiService.updateRow con is_active = false
  it('softDeleteCategory_shouldCallUpdateRow_withIsActiveFalse', async () => {
    const targetRow = 2;
    const existingRow = [...SHEETS_ROWS[1]];
    sheetsApiSpy.getRange.mockReturnValue(
      of({ range: `CATEGORIES!A${targetRow}:J${targetRow}`, majorDimension: 'ROWS' as const, values: [existingRow] }),
    );

    await firstValueFrom(service.softDeleteCategory(MOCK_CATEGORIES[0].categoryId, targetRow));

    const lastCall = sheetsApiSpy.updateRow.mock.calls[sheetsApiSpy.updateRow.mock.calls.length - 1];
    const [range, rows] = lastCall;
    expect(range).toContain(`A${targetRow}`);
    expect(rows[0][8]).toBe(false); // col I (index 8) = is_active
  });
});
