import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';

import { CurrencyStateService } from '@core/state/currency.state';
import { CurrencyApiService } from '@core/services/currency-api.service';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
import { ICurrency } from '@models/currency.model';

describe('CurrencyStateService', () => {
  let spectator: SpectatorService<CurrencyStateService>;

  const createService = createServiceFactory({
    service: CurrencyStateService,
    mocks: [CurrencyApiService, SheetsApiService, AuthService],
  });

  const MOCK_USER = { sub: 'usr_001', email: 'user@test.com', name: 'Test' };

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
    spectator = createService();
    spectator.inject(AuthService).getUser.mockReturnValue(MOCK_USER);
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(
      of({ updates: { updatedRange: 'CURRENCIES!A3:F3' } }),
    );
    spectator.inject(SheetsApiService).updateRow.mockReturnValue(of(undefined));
  });

  it('load_shouldSetBaseCurrency_whenSettingExists', fakeAsync(() => {
    spectator.inject(SheetsApiService).getRange.mockImplementation((range: string) => {
      if (range.includes('CURRENCIES')) return of(CURRENCIES_RESPONSE);
      return of(SETTINGS_RESPONSE_WITH_BASE);
    });

    spectator.service.load();
    flushMicrotasks();

    expect(spectator.service.baseCurrency()).toBe('USD');
    expect(spectator.service.items().length).toBe(1);
    expect(spectator.service.loading()).toBe(false);
  }));

  it('load_shouldHandleError', fakeAsync(() => {
    spectator.inject(SheetsApiService).getRange.mockReturnValue(throwError(() => 'API Error'));
    spectator.service.load();
    flushMicrotasks();
    expect(spectator.service.error()).toBe('API Error');
  }));

  it('fetchAndPersistRate_shouldUpdateExisting_whenExists', fakeAsync(() => {
    // 1. Cargar inicial
    spectator.inject(SheetsApiService).getRange.mockImplementation((range: string) => {
      if (range.includes('CURRENCIES')) return of(CURRENCIES_RESPONSE);
      return of(SETTINGS_RESPONSE_EMPTY);
    });
    spectator.service.load();
    flushMicrotasks();

    // 2. Fetch de la misma moneda
    spectator.inject(CurrencyApiService).getRate.mockReturnValue(of(1.10));
    spectator.service.fetchAndPersistRate('USD', 'EUR');
    flushMicrotasks();

    expect(spectator.inject(SheetsApiService).updateRow).toHaveBeenCalled();
    expect(spectator.service.items().find(c => c.currencyCode === 'USD')?.rateToBase).toBe(1.10);
  }));

  it('saveCurrency_shouldAppendNew_whenDoesNotExist', fakeAsync(() => {
    const newCurrency: ICurrency = {
      currencyCode: 'GBP',
      name: 'British Pound',
      rateToBase: 0.8,
      lastUpdated: 'now',
      source: 'manual'
    };
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(of({ updates: { updatedRange: 'CURRENCIES!10:10' } }));

    spectator.service.saveCurrency(newCurrency);
    flushMicrotasks();

    expect(spectator.inject(SheetsApiService).appendRow).toHaveBeenCalled();
    expect(spectator.service.items().some(c => c.currencyCode === 'GBP')).toBe(true);
    expect(spectator.service.rowMap()['GBP']).toBe(10);
  }));

  it('saveCurrency_shouldUpdateExisting_whenExists', fakeAsync(() => {
    // 1. Cargar USD
    spectator.inject(SheetsApiService).getRange.mockImplementation((range: string) => {
      if (range.includes('CURRENCIES')) return of(CURRENCIES_RESPONSE);
      return of(SETTINGS_RESPONSE_EMPTY);
    });
    spectator.service.load();
    flushMicrotasks();

    const updated: ICurrency = {
      currencyCode: 'USD',
      name: 'US Dollar Mod',
      rateToBase: 1.05,
      lastUpdated: 'now',
      source: 'manual'
    };

    spectator.service.saveCurrency(updated);
    flushMicrotasks();

    expect(spectator.inject(SheetsApiService).updateRow).toHaveBeenCalled();
    expect(spectator.service.items().find(c => c.currencyCode === 'USD')?.name).toBe('US Dollar Mod');
  }));

  it('setBaseCurrency_shouldAppend_whenNoPreviousBase', fakeAsync(() => {
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(of({ updates: { updatedRange: 'USER_SETTINGS!5:5' } }));
    spectator.service.setBaseCurrency('EUR');
    flushMicrotasks();
    expect(spectator.service.baseCurrency()).toBe('EUR');
    expect(spectator.service.baseCurrencyRowNumber()).toBe(5);
  }));

  it('setBaseCurrency_shouldUpdate_whenPreviousBaseExists', fakeAsync(() => {
    // 1. Cargar base inicial
    spectator.inject(SheetsApiService).getRange.mockImplementation((range: string) => {
      if (range.includes('CURRENCIES')) return of(CURRENCIES_RESPONSE);
      return of(SETTINGS_RESPONSE_WITH_BASE);
    });
    spectator.service.load();
    flushMicrotasks();

    spectator.service.setBaseCurrency('JPY');
    flushMicrotasks();
    expect(spectator.inject(SheetsApiService).updateRow).toHaveBeenCalled();
    expect(spectator.service.baseCurrency()).toBe('JPY');
  }));
});
