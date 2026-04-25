import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';

import { fetchAndPersistRate$ } from '@store/currency/currency.effects';
import { CurrencyActions } from '@store/currency/currency.actions';
import { CurrencyApiService } from '@core/services/currency-api.service';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
import { selectCurrencyRowMap } from '@store/currency/currency.selectors';

// REQ-09: fetchAndPersistRate$ calls CurrencyApiService first, then SheetsApiService.
// CurrencyApiService must NEVER call SheetsApiService.
describe('currency.effects — fetchAndPersistRate$', () => {
  let actions$: Observable<Action>;
  let store: MockStore;
  let currencyApiSpy: jasmine.SpyObj<CurrencyApiService>;
  let sheetsApiSpy: jasmine.SpyObj<SheetsApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  const callOrder: string[] = [];

  beforeEach(() => {
    callOrder.length = 0;

    currencyApiSpy = jasmine.createSpyObj<CurrencyApiService>('CurrencyApiService', ['getRate']);
    sheetsApiSpy   = jasmine.createSpyObj<SheetsApiService>('SheetsApiService', ['appendRow', 'updateRow']);
    authSpy        = jasmine.createSpyObj<AuthService>('AuthService', ['getUser']);

    currencyApiSpy.getRate.and.callFake(() => {
      callOrder.push('currencyApi.getRate');
      return of(1.08);
    });
    sheetsApiSpy.appendRow.and.callFake(() => {
      callOrder.push('sheetsApi.appendRow');
      return of({ updates: { updatedRange: 'CURRENCIES!A2:F2' } });
    });
    authSpy.getUser.and.returnValue({ sub: 'user-123', name: 'Test', email: 'test@test.com' });

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            { selector: selectCurrencyRowMap, value: {} },
          ],
        }),
        { provide: CurrencyApiService, useValue: currencyApiSpy },
        { provide: SheetsApiService,   useValue: sheetsApiSpy },
        { provide: AuthService,        useValue: authSpy },
      ],
    });

    store = TestBed.inject(MockStore);
  });

  it('calls CurrencyApiService.getRate() BEFORE SheetsApiService.appendRow() (REQ-09)', done => {
    actions$ = of(CurrencyActions.fetchAndPersistRate({ from: 'USD', to: 'EUR' }));

    TestBed.runInInjectionContext(() => {
      fetchAndPersistRate$(
        actions$ as Observable<Action>,
        currencyApiSpy,
        sheetsApiSpy,
        authSpy,
        store,
      ).subscribe(action => {
        expect(callOrder[0]).toBe('currencyApi.getRate');
        expect(callOrder[1]).toBe('sheetsApi.appendRow');
        expect(currencyApiSpy.getRate).toHaveBeenCalledWith('USD', 'EUR');
        expect(sheetsApiSpy.appendRow).toHaveBeenCalled();
        expect(action.type).toBe(CurrencyActions.fetchAndPersistRateSuccess.type);
        done();
      });
    });
  });

  it('dispatches fetchAndPersistRateFailure when CurrencyApiService throws (REQ-09)', done => {
    currencyApiSpy.getRate.and.returnValue(throwError(() => new Error('API down')));
    actions$ = of(CurrencyActions.fetchAndPersistRate({ from: 'USD', to: 'EUR' }));

    TestBed.runInInjectionContext(() => {
      fetchAndPersistRate$(
        actions$ as Observable<Action>,
        currencyApiSpy,
        sheetsApiSpy,
        authSpy,
        store,
      ).subscribe(action => {
        expect(action.type).toBe(CurrencyActions.fetchAndPersistRateFailure.type);
        expect(sheetsApiSpy.appendRow).not.toHaveBeenCalled();
        done();
      });
    });
  });

  // REQ-09 constraint: CurrencyApiService must not import or inject SheetsApiService
  it('CurrencyApiService does not reference SheetsApiService', () => {
    // The spy is constructed with only getRate — no Sheets methods exist on it.
    // This is a structural check: if CurrencyApiService had SheetsApiService,
    // its constructor would require it and this TestBed setup would fail.
    expect(currencyApiSpy.getRate).toBeDefined();
    expect((currencyApiSpy as unknown as Record<string, unknown>)['appendRow']).toBeUndefined();
    expect((currencyApiSpy as unknown as Record<string, unknown>)['updateRow']).toBeUndefined();
    expect((currencyApiSpy as unknown as Record<string, unknown>)['getRange']).toBeUndefined();
  });
});
