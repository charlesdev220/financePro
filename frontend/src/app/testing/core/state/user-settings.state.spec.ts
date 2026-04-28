import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of } from 'rxjs';

import { UserSettingsStateService } from '../../../core/state/user-settings.state';
import { SheetsApiService } from '../../../core/services/sheets-api.service';
import { AuthService } from '../../../core/services/auth.service';

// ─────────────────────────────────────────────────────────────────────────────
// UserSettingsStateService
// ─────────────────────────────────────────────────────────────────────────────
describe('UserSettingsStateService', () => {
  let service: UserSettingsStateService;
  let sheetsApiSpy: jasmine.SpyObj<SheetsApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  const MOCK_USER = { sub: 'usr_001', name: 'Test', email: 'test@test.com' };

  beforeEach(() => {
    sheetsApiSpy = jasmine.createSpyObj('SheetsApiService', ['getRange', 'appendRow', 'updateRow']);
    authSpy      = jasmine.createSpyObj('AuthService', ['getUser']);
    authSpy.getUser.and.returnValue(MOCK_USER);

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
    sheetsApiSpy.getRange.and.returnValue(of({ range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS', values: [['settingId', 'userId', 'key', 'value']] }));

    // When
    service.load();
    flushMicrotasks();

    // Then
    expect(service.defaultCategoryBudget()).toBe(200);
  }));

  // REQ-03 sc2: lee valor personalizado desde USER_SETTINGS
  it('defaultCategoryBudget_shouldReadCustomValue_whenSettingExistsInSheets', fakeAsync(() => {
    // Given: fila con default_category_budget = 350
    sheetsApiSpy.getRange.and.returnValue(of({
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
    sheetsApiSpy.getRange.and.returnValue(of({ range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS', values: [['settingId', 'userId', 'key', 'value']] }));
    sheetsApiSpy.appendRow.and.returnValue(of({ updates: { updatedRange: 'USER_SETTINGS!A3:D3' } }));
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
    sheetsApiSpy.getRange.and.returnValue(of({ range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS', values: [['settingId', 'userId', 'key', 'value']] }));
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
});
