import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of } from 'rxjs';

import { UserSettingsStateService } from '@core/state/user-settings.state';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';

// ─────────────────────────────────────────────────────────────────────────────
// UserSettingsStateService
// ─────────────────────────────────────────────────────────────────────────────
describe('UserSettingsStateService', () => {
  let service: UserSettingsStateService;
  let sheetsApiSpy: jest.Mocked<SheetsApiService>;
  let authSpy: jest.Mocked<AuthService>;

  const MOCK_USER = { sub: 'usr_001', name: 'Test', email: 'test@test.com' };

  beforeEach(() => {
    sheetsApiSpy = {
      getRange:  jest.fn(),
      appendRow: jest.fn(),
      updateRow: jest.fn(),
    } as unknown as jest.Mocked<SheetsApiService>;

    authSpy = {
      getUser: jest.fn().mockReturnValue(MOCK_USER),
    } as unknown as jest.Mocked<AuthService>;

    TestBed.configureTestingModule({
      providers: [
        UserSettingsStateService,
        { provide: SheetsApiService, useValue: sheetsApiSpy },
        { provide: AuthService,      useValue: authSpy },
      ],
    });
    service = TestBed.inject(UserSettingsStateService);
  });

  // REQ-03 sc1: valor por defecto = 200 cuando no hay fila en USER_SETTINGS
  it('defaultCategoryBudget_shouldBe200_whenSettingNotFoundInSheets', fakeAsync(() => {
    // Given: USER_SETTINGS vacío (solo headers)
    sheetsApiSpy.getRange.mockReturnValue(of({ range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS', values: [['settingId', 'userId', 'key', 'value']] }));

    // When
    service.load();
    flushMicrotasks();

    // Then
    expect(service.defaultCategoryBudget()).toBe(200);
  }));

  // REQ-03 sc2: lee valor personalizado desde USER_SETTINGS
  it('defaultCategoryBudget_shouldReadCustomValue_whenSettingExistsInSheets', fakeAsync(() => {
    // Given: fila con default_category_budget = 350
    sheetsApiSpy.getRange.mockReturnValue(of({
      range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS',
      values: [
        ['settingId', 'userId', 'key', 'value'],
        ['set_abc', 'usr_001', 'default_category_budget', '350'],
      ],
    }));

    // When
    service.load();
    flushMicrotasks();

    // Then
    expect(service.defaultCategoryBudget()).toBe(350);
  }));

  // REQ-03 sc3: guardar nuevo valor actualiza el signal
  it('saveDefaultBudget_shouldUpdateSignal_whenAmountIsValid', fakeAsync(() => {
    // Given: sin fila previa → appendRow
    sheetsApiSpy.getRange.mockReturnValue(of({ range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS', values: [['settingId', 'userId', 'key', 'value']] }));
    sheetsApiSpy.appendRow.mockReturnValue(of({ updates: { updatedRange: 'USER_SETTINGS!A3:D3' } }));
    service.load();
    flushMicrotasks();

    // When
    service.saveDefaultBudget(500);
    flushMicrotasks();

    // Then
    expect(service.defaultCategoryBudget()).toBe(500);
    expect(sheetsApiSpy.appendRow).toHaveBeenCalled();
  }));

  // Edge case: amount <= 0 no persiste ni actualiza
  it('saveDefaultBudget_shouldIgnore_whenAmountIsZeroOrNegative', fakeAsync(() => {
    // Given
    sheetsApiSpy.getRange.mockReturnValue(of({ range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS', values: [['settingId', 'userId', 'key', 'value']] }));
    service.load();
    flushMicrotasks();
    const before = service.defaultCategoryBudget();

    // When
    service.saveDefaultBudget(0);
    service.saveDefaultBudget(-50);
    flushMicrotasks();

    // Then: signal no cambió, no se llamó appendRow
    expect(service.defaultCategoryBudget()).toBe(before);
    expect(sheetsApiSpy.appendRow).not.toHaveBeenCalled();
  }));

  // REQ-06 sc1: monthStartDay() retorna 1 cuando no hay fila 'month_start_day' en USER_SETTINGS
  it('monthStartDay_shouldReturn1_whenSettingNotFound', fakeAsync(() => {
    // Given: solo headers, sin fila month_start_day
    sheetsApiSpy.getRange.mockReturnValue(of({
      range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS',
      values: [['settingId', 'userId', 'key', 'value']],
    }));

    // When
    service.load();
    flushMicrotasks();

    // Then
    expect(service.monthStartDay()).toBe(1);
  }));

  // REQ-06 sc2: monthStartDay() retorna 15 cuando hay fila con value '15'
  it('monthStartDay_shouldReturn15_whenSettingExists', fakeAsync(() => {
    // Given: fila con month_start_day = 15
    sheetsApiSpy.getRange.mockReturnValue(of({
      range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS',
      values: [
        ['settingId', 'userId', 'key', 'value'],
        ['set_msd', 'usr_001', 'month_start_day', '15'],
      ],
    }));

    // When
    service.load();
    flushMicrotasks();

    // Then
    expect(service.monthStartDay()).toBe(15);
  }));

  // REQ-06 sc3: saveMonthStartDay(10) llama appendRow y actualiza signal cuando no hay fila previa
  it('saveMonthStartDay_shouldCallAppendRowAndUpdateSignal_whenNoExistingRow', fakeAsync(() => {
    // Given: sin fila previa
    sheetsApiSpy.getRange.mockReturnValue(of({
      range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS',
      values: [['settingId', 'userId', 'key', 'value']],
    }));
    sheetsApiSpy.appendRow.mockReturnValue(of({ updates: { updatedRange: 'USER_SETTINGS!A3:D3' } }));
    service.load();
    flushMicrotasks();

    // When
    service.saveMonthStartDay(10);
    flushMicrotasks();

    // Then
    expect(service.monthStartDay()).toBe(10);
    expect(sheetsApiSpy.appendRow).toHaveBeenCalled();
    expect(sheetsApiSpy.updateRow).not.toHaveBeenCalled();
  }));

  // REQ-06 sc4: saveMonthStartDay(20) llama updateRow (no appendRow) cuando ya existe la fila
  it('saveMonthStartDay_shouldCallUpdateRow_whenExistingRowLoaded', fakeAsync(() => {
    // Given: fila existente en row 2 → load() registra rowNumber=2
    sheetsApiSpy.getRange.mockReturnValue(of({
      range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS',
      values: [
        ['settingId', 'userId', 'key', 'value'],
        ['set_msd', 'usr_001', 'month_start_day', '5'],
      ],
    }));
    sheetsApiSpy.updateRow.mockReturnValue(of(undefined));
    service.load();
    flushMicrotasks();

    // When
    service.saveMonthStartDay(20);
    flushMicrotasks();

    // Then
    expect(service.monthStartDay()).toBe(20);
    expect(sheetsApiSpy.updateRow).toHaveBeenCalled();
    expect(sheetsApiSpy.appendRow).not.toHaveBeenCalled();
  }));

  // REQ-06 sc5: saveMonthStartDay(29) no modifica el signal ni llama appendRow/updateRow (fuera de rango 1-28)
  it('saveMonthStartDay_shouldIgnore_whenDayOutOfRange', fakeAsync(() => {
    // Given
    sheetsApiSpy.getRange.mockReturnValue(of({
      range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS',
      values: [['settingId', 'userId', 'key', 'value']],
    }));
    service.load();
    flushMicrotasks();
    const before = service.monthStartDay();

    // When: valor fuera de rango
    service.saveMonthStartDay(29);
    flushMicrotasks();

    // Then: sin cambio
    expect(service.monthStartDay()).toBe(before);
    expect(sheetsApiSpy.appendRow).not.toHaveBeenCalled();
    expect(sheetsApiSpy.updateRow).not.toHaveBeenCalled();
  }));
});
