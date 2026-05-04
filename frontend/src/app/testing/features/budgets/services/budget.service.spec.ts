import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of, firstValueFrom } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { calculateStatus, rowToBudget, budgetToRow, BudgetService } from '@features/budgets/services/budget.service';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
import { IBudget } from '@models/budget.model';

// ─────────────────────────────────────────────────────────────────────────────
// calculateStatus — función pura, no requiere DI
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateStatus', () => {
  // REQ-08 sc1: gasto < 80% → 'ok'
  it('returns ok when spent is below 80%', () => {
    expect(calculateStatus(300, 500)).toBe('ok');
  });

  // REQ-08 sc2: gasto entre 80% y 99% → 'warning'
  it('returns warning when spent is between 80% and 99%', () => {
    expect(calculateStatus(420, 500)).toBe('warning');
  });

  // REQ-08 sc3: gasto >= 100% → 'exceeded'
  it('returns exceeded when spent is >= 100%', () => {
    expect(calculateStatus(520, 500)).toBe('exceeded');
  });

  // REQ-08 sc4: exactamente 80% → 'warning' (límite inferior de warning)
  it('returns warning at exactly 80%', () => {
    expect(calculateStatus(400, 500)).toBe('warning');
  });

  // REQ-08 sc5: exactamente 100% → 'exceeded' (límite inferior de exceeded)
  it('returns exceeded at exactly 100%', () => {
    expect(calculateStatus(500, 500)).toBe('exceeded');
  });

  // REQ-08 sc6: 0 gasto → 'ok'
  it('returns ok when spent is 0', () => {
    expect(calculateStatus(0, 500)).toBe('ok');
  });

  // Edge: budgetAmount <= 0 → siempre 'exceeded' (división por cero protegida)
  it('returns exceeded when budgetAmount is 0', () => {
    expect(calculateStatus(0, 0)).toBe('exceeded');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rowToBudget — mapper de los 8 campos del schema BUDGETS A:H
// ─────────────────────────────────────────────────────────────────────────────
describe('rowToBudget', () => {
  const mockRow = [
    'b-001',
    'u-001',
    'cat-food',
    '2026-04',
    '500',
    '320',
    'ok',
    '2026-04-12T00:00:00Z',
  ];

  it('maps all 8 fields from schema BUDGETS A:H correctly', () => {
    const budget: IBudget = rowToBudget(mockRow);

    expect(budget.budgetId).toBe('b-001');
    expect(budget.userId).toBe('u-001');
    expect(budget.categoryId).toBe('cat-food');
    expect(budget.period).toBe('2026-04');
    expect(budget.budgetAmount).toBe(500);
    expect(budget.spentAmount).toBe(320);
    expect(budget.status).toBe('ok');
    expect(budget.lastUpdated).toBe('2026-04-12T00:00:00Z');
  });

  it('converts amount fields to numbers', () => {
    const row = ['b-002', 'u-001', 'cat-1', '2026-04', '1000', '850', 'warning', '2026-04-01T00:00:00Z'];

    const budget = rowToBudget(row);

    expect(typeof budget.budgetAmount).toBe('number');
    expect(typeof budget.spentAmount).toBe('number');
    expect(budget.budgetAmount).toBe(1000);
    expect(budget.spentAmount).toBe(850);
  });

  it('defaults to empty string and 0 for missing or undefined cells', () => {
    const partialRow: unknown[] = [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined];

    const budget = rowToBudget(partialRow);

    expect(budget.budgetId).toBe('');
    expect(budget.userId).toBe('');
    expect(budget.budgetAmount).toBe(0);
    expect(budget.spentAmount).toBe(0);
    expect(budget.status).toBe('ok');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rowToBudget — casos de mode y workspaceId (REQ-11, Fase 3 + Fase 1)
// ─────────────────────────────────────────────────────────────────────────────
describe('rowToBudget — mode y workspaceId', () => {
  // REQ-11 sc1 — row[9] vacío → mode === 'indefinite'
  it('defaults_mode_to_indefinite_when_row9_is_empty', () => {
    const row = ['b-001', 'u-001', 'cat-1', '2026-04', '500', '0', 'ok', '2026-04-01T00:00:00Z', 'ws_aaa', ''];

    const budget = rowToBudget(row);

    expect(budget.mode).toBe('indefinite');
  });

  // REQ-11 sc2 — row[9] = 'period' → parsea fechas de inicio y fin
  it('parses_mode_period_with_startDate_and_endDate', () => {
    const row = ['b-002', 'u-001', 'cat-1', '2026-04', '500', '0', 'ok', '2026-04-01T00:00:00Z', 'ws_aaa', 'period', '2026-01-01', '2026-03-31'];

    const budget = rowToBudget(row);

    expect(budget.mode).toBe('period');
    expect(budget.startDate).toBe('2026-01-01');
    expect(budget.endDate).toBe('2026-03-31');
  });

  // REQ-11 sc3 — row[9] = 'disabled' → mode === 'disabled'
  it('parses_mode_disabled', () => {
    const row = ['b-003', 'u-001', 'cat-1', '2026-04', '500', '0', 'ok', '2026-04-01T00:00:00Z', 'ws_aaa', 'disabled'];

    const budget = rowToBudget(row);

    expect(budget.mode).toBe('disabled');
    expect(budget.startDate).toBeUndefined();
    expect(budget.endDate).toBeUndefined();
  });

  // REQ-01 sc1 — row[8] vacío → fallback a defaultWsId
  it('defaults_workspaceId_to_defaultWsId_when_row8_is_empty', () => {
    const row = ['b-004', 'u-001', 'cat-1', '2026-04', '500', '0', 'ok', '2026-04-01T00:00:00Z', ''];

    const budget = rowToBudget(row, 'ws_default');

    expect(budget.workspaceId).toBe('ws_default');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BudgetService.loadBudgets — REQ-11 sc2: hoja vacía → []
// ─────────────────────────────────────────────────────────────────────────────
describe('BudgetService.loadBudgets', () => {
  let spectator: SpectatorService<BudgetService>;
  const createService = createServiceFactory({
    service: BudgetService,
    mocks: [SheetsApiService, AuthService],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });

  beforeEach(() => {
    spectator = createService();
    spectator.inject(AuthService).isAuthenticated.mockReturnValue(false);
  });

  // REQ-11 sc2: hoja solo con encabezados (1 fila) → {budgets:[], rowMap:{}}
  it('loadBudgets_shouldReturnEmpty_whenSheetHasOnlyHeaderRow', async () => {
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of({
        range: 'BUDGETS!A:H',
        majorDimension: 'ROWS',
        values: [['budget_id', 'user_id', 'category_id', 'period', 'budget_amount', 'spent_amount', 'status', 'last_updated']],
      }),
    );

    const result = await firstValueFrom(spectator.service.loadBudgets());

    expect(result.budgets).toEqual([]);
    expect(result.rowMap).toEqual({});
  });

  // REQ-11 sc2 (edge): respuesta null → vacío sin error
  it('loadBudgets_shouldReturnEmpty_whenResponseIsNull', async () => {
    spectator.inject(SheetsApiService).getRange.mockReturnValue(of(null));

    const result = await firstValueFrom(spectator.service.loadBudgets());

    expect(result.budgets).toEqual([]);
    expect(result.rowMap).toEqual({});
  });

  // REQ-11 sc2 (edge): values array vacío → vacío sin error
  it('loadBudgets_shouldReturnEmpty_whenValuesArrayIsEmpty', async () => {
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of({ range: 'BUDGETS!A:H', majorDimension: 'ROWS', values: [] }),
    );

    const result = await firstValueFrom(spectator.service.loadBudgets());

    expect(result.budgets).toEqual([]);
    expect(result.rowMap).toEqual({});
  });

  // sc3: hoja con filas de datos — filtra por userId y construye rowMap
  it('loadBudgets_shouldReturnFilteredBudgets_andBuildRowMap', async () => {
    spectator.inject(AuthService).getUser.mockReturnValue({ sub: 'usr_001', email: 'a@b.com', name: 'Test' });
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of({
        range: 'BUDGETS!A:L',
        majorDimension: 'ROWS',
        values: [
          ['budget_id', 'user_id', 'category_id', 'period', 'budget_amount', 'spent_amount', 'status', 'last_updated', 'workspace_id', 'mode', 'start_date', 'end_date'],
          ['bgt_001', 'usr_001', 'cat_food', '2026-04', '500', '200', 'ok', '2026-04-01T00:00:00Z', 'ws_001', 'indefinite', '', ''],
          ['bgt_002', 'usr_other', 'cat_rent', '2026-04', '1000', '1000', 'exceeded', '2026-04-01T00:00:00Z', 'ws_001', 'indefinite', '', ''],
        ],
      }),
    );

    const result = await firstValueFrom(spectator.service.loadBudgets('ws_001'));

    expect(result.budgets.length).toBe(1);
    expect(result.budgets[0].budgetId).toBe('bgt_001');
    expect(result.rowMap['bgt_001']).toBe(2);
    expect(result.rowMap['bgt_002']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BudgetService — saveBudget, updateBudget, deleteBudget
// ─────────────────────────────────────────────────────────────────────────────
describe('BudgetService — write operations', () => {
  let spectator: SpectatorService<BudgetService>;
  const createService = createServiceFactory({
    service: BudgetService,
    mocks: [SheetsApiService, AuthService],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });

  const mockBudget: IBudget = {
    budgetId: 'bgt_001',
    userId: 'usr_001',
    categoryId: 'cat_food',
    period: '2026-04',
    budgetAmount: 500,
    spentAmount: 200,
    status: 'ok',
    lastUpdated: '2026-04-01T00:00:00Z',
    workspaceId: 'ws_001',
    mode: 'indefinite',
    startDate: undefined,
    endDate: undefined,
  };

  beforeEach(() => {
    spectator = createService();
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(of(undefined));
    spectator.inject(SheetsApiService).updateRow.mockReturnValue(of(undefined));
    spectator.inject(SheetsApiService).deleteRow.mockReturnValue(of(undefined));
  });

  // saveBudget — llama a appendRow con la fila correcta
  it('saveBudget_shouldCallAppendRow_withBudgetRow', async () => {
    await firstValueFrom(spectator.service.saveBudget(mockBudget));

    expect(spectator.inject(SheetsApiService).appendRow).toHaveBeenCalledWith(
      'BUDGETS!A1',
      [budgetToRow(mockBudget)],
    );
  });

  // updateBudget — llama a updateRow con el rango de fila correcto
  it('updateBudget_shouldCallUpdateRow_withCorrectRange', async () => {
    await firstValueFrom(spectator.service.updateBudget(mockBudget, 5));

    expect(spectator.inject(SheetsApiService).updateRow).toHaveBeenCalledWith(
      'BUDGETS!A5:L5',
      [budgetToRow(mockBudget)],
    );
  });

  // deleteBudget — llama a deleteRow con el rango de fila correcto
  it('deleteBudget_shouldCallDeleteRow_withCorrectRange', async () => {
    await firstValueFrom(spectator.service.deleteBudget(3));

    expect(spectator.inject(SheetsApiService).deleteRow).toHaveBeenCalledWith(
      'BUDGETS!A3:L3',
    );
  });
});
