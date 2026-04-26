import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CurrencyStateService } from '../../../core/state/currency.state';
import { CurrencyApiService } from '../../../core/services/currency-api.service';
import { SheetsApiService } from '../../../core/services/sheets-api.service';
import { AuthService } from '../../../core/services/auth.service';

// ─────────────────────────────────────────────────────────────────────────────
// CurrencyStateService — REQ-04
// ─────────────────────────────────────────────────────────────────────────────
describe('CurrencyStateService', () => {
  let service: CurrencyStateService;
  let currencyApiSpy: jasmine.SpyObj<CurrencyApiService>;
  let sheetsApiSpy: jasmine.SpyObj<SheetsApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  const MOCK_USER = { sub: 'usr_001', email: 'user@test.com', name: 'Test' };

  const CURRENCIES_RESPONSE = {
    range: 'CURRENCIES!A:F', majorDimension: 'ROWS' as const,
    values: [
      ['cur_id', 'user_id', 'currency_code', 'name', 'rate_to_base', 'last_updated', 'source'],
      ['cur_001', 'usr_001', 'USD', 'US Dollar', '1', '2026-04-26T00:00:00.000Z', 'api'],
    ],
  };
  const SETTINGS_RESPONSE_WITH_BASE = {
    range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS' as const,
    values: [
      ['setting_id', 'user_id', 'key', 'value'],
      ['set_001', 'usr_001', 'base_currency', 'USD'],
    ],
  };
  const SETTINGS_RESPONSE_EMPTY = {
    range: 'USER_SETTINGS!A:D', majorDimension: 'ROWS' as const,
    values: [['setting_id', 'user_id', 'key', 'value']],
  };

  beforeEach(() => {
    currencyApiSpy = jasmine.createSpyObj('CurrencyApiService', ['getRate']);
    sheetsApiSpy   = jasmine.createSpyObj('SheetsApiService', ['getRange', 'appendRow', 'updateRow']);
    authSpy        = jasmine.createSpyObj('AuthService', ['getUser', 'getAccessToken']);

    authSpy.getUser.and.returnValue(MOCK_USER);
    sheetsApiSpy.appendRow.and.returnValue(of({ updates: { updatedRange: 'CURRENCIES!A3:F3' } }));
    sheetsApiSpy.updateRow.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        CurrencyStateService,
        { provide: CurrencyApiService, useValue: currencyApiSpy },
        { provide: SheetsApiService,   useValue: sheetsApiSpy },
        { provide: AuthService,        useValue: authSpy },
      ],
    });

    service = TestBed.inject(CurrencyStateService);
  });

  // REQ-04 sc1 — load() con baseCurrency → baseCurrency() es 'USD'
  it('load_shouldSetBaseCurrency_whenSettingExists', fakeAsync(() => {
    sheetsApiSpy.getRange.and.callFake((range: string) => {
      if (range.includes('CURRENCIES')) return of(CURRENCIES_RESPONSE);
      return of(SETTINGS_RESPONSE_WITH_BASE);
    });

    service.load();
    flushMicrotasks();

    expect(service.baseCurrency()).toBe('USD');
    expect(service.items().length).toBe(1);
    expect(service.loading()).toBeFalse();
  }));

  // REQ-04 sc2 — load() sin baseCurrency → baseCurrency() es null
  it('load_shouldLeaveBaseCurrencyNull_whenNoSettingExists', fakeAsync(() => {
    sheetsApiSpy.getRange.and.callFake((range: string) => {
      if (range.includes('CURRENCIES')) return of(CURRENCIES_RESPONSE);
      return of(SETTINGS_RESPONSE_EMPTY);
    });

    service.load();
    flushMicrotasks();

    expect(service.baseCurrency()).toBeNull();
  }));

  // REQ-04 sc3 — fetchAndPersistRate() registro nuevo → items() contiene la divisa
  it('fetchAndPersistRate_shouldAddCurrency_whenNewRate', fakeAsync(() => {
    sheetsApiSpy.getRange.and.returnValue(of({ range: 'CURRENCIES!A:F', majorDimension: 'ROWS' as const, values: [] }));
    currencyApiSpy.getRate.and.returnValue(of(1.08));

    service.fetchAndPersistRate('EUR', 'USD');
    flushMicrotasks();

    expect(service.items().some(c => c.currencyCode === 'EUR')).toBeTrue();
  }));

  // REQ-04 sc4 — fetchAndPersistRate() error de API → error() no null, items() sin cambio
  it('fetchAndPersistRate_shouldSetError_whenApiFails', fakeAsync(() => {
    currencyApiSpy.getRate.and.returnValue(throwError(() => new Error('API error')));

    service.fetchAndPersistRate('GBP', 'USD');
    flushMicrotasks();

    expect(service.error()).not.toBeNull();
    expect(service.items().some(c => c.currencyCode === 'GBP')).toBeFalse();
  }));
});
