import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CurrencyStateService } from '@core/state/currency.state';
import { CurrencyApiService } from '@core/services/currency-api.service';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';

// ─────────────────────────────────────────────────────────────────────────────
// CurrencyStateService — REQ-04
// ─────────────────────────────────────────────────────────────────────────────
describe('CurrencyStateService', () => {
  let service: CurrencyStateService;
  let currencyApiSpy: jest.Mocked<CurrencyApiService>;
  let sheetsApiSpy: jest.Mocked<SheetsApiService>;
  let authSpy: jest.Mocked<AuthService>;

  const MOCK_USER = { sub: 'usr_001', email: 'user@test.com', name: 'Test' };

  // rowToCurrency usa row[0]=userId, row[1]=currencyCode, row[2]=name, row[3]=rate, row[4]=lastUpdated, row[5]=source
  // La fila de datos empieza directamente con userId (sin columna id separada)
  const CURRENCIES_RESPONSE = {
    range: 'CURRENCIES!A:F', majorDimension: 'ROWS' as const,
    values: [
      ['user_id', 'currency_code', 'name', 'rate_to_base', 'last_updated', 'source'],
      ['usr_001', 'USD', 'US Dollar', '1', '2026-04-26T00:00:00.000Z', 'api'],
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
    currencyApiSpy = {
      getRate: jest.fn(),
    } as unknown as jest.Mocked<CurrencyApiService>;

    sheetsApiSpy = {
      getRange:   jest.fn(),
      appendRow:  jest.fn().mockReturnValue(of({ updates: { updatedRange: 'CURRENCIES!A3:F3' } })),
      updateRow:  jest.fn().mockReturnValue(of(undefined)),
    } as unknown as jest.Mocked<SheetsApiService>;

    authSpy = {
      getUser:         jest.fn().mockReturnValue(MOCK_USER),
      getAccessToken:  jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

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
    sheetsApiSpy.getRange.mockImplementation((range: string) => {
      if (range.includes('CURRENCIES')) return of(CURRENCIES_RESPONSE);
      return of(SETTINGS_RESPONSE_WITH_BASE);
    });

    service.load();
    flushMicrotasks();

    expect(service.baseCurrency()).toBe('USD');
    expect(service.items().length).toBe(1);
    expect(service.loading()).toBe(false);
  }));

  // REQ-04 sc2 — load() sin baseCurrency → baseCurrency() es null
  it('load_shouldLeaveBaseCurrencyNull_whenNoSettingExists', fakeAsync(() => {
    sheetsApiSpy.getRange.mockImplementation((range: string) => {
      if (range.includes('CURRENCIES')) return of(CURRENCIES_RESPONSE);
      return of(SETTINGS_RESPONSE_EMPTY);
    });

    service.load();
    flushMicrotasks();

    expect(service.baseCurrency()).toBeNull();
  }));

  // REQ-04 sc3 — fetchAndPersistRate() registro nuevo → items() contiene la divisa
  it('fetchAndPersistRate_shouldAddCurrency_whenNewRate', fakeAsync(() => {
    sheetsApiSpy.getRange.mockReturnValue(of({ range: 'CURRENCIES!A:F', majorDimension: 'ROWS' as const, values: [] }));
    currencyApiSpy.getRate.mockReturnValue(of(1.08));

    service.fetchAndPersistRate('EUR', 'USD');
    flushMicrotasks();

    expect(service.items().some(c => c.currencyCode === 'EUR')).toBe(true);
  }));

  // REQ-04 sc4 — fetchAndPersistRate() error de API → error() no null, items() sin cambio
  it('fetchAndPersistRate_shouldSetError_whenApiFails', fakeAsync(() => {
    currencyApiSpy.getRate.mockReturnValue(throwError(() => new Error('API error')));

    service.fetchAndPersistRate('GBP', 'USD');
    flushMicrotasks();

    expect(service.error()).not.toBeNull();
    expect(service.items().some(c => c.currencyCode === 'GBP')).toBe(false);
  }));
});
