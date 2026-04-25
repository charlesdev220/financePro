import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, concatMap, map, of, switchMap, withLatestFrom, forkJoin } from 'rxjs';
import { CurrencyActions } from './currency.actions';
import { CurrencyApiService } from '@core/services/currency-api.service';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
import { ICurrency } from '@models/currency.model';
import { selectCurrencyRowMap, selectCurrencyState } from './currency.selectors';

// Existing effect — do not remove
export const loadRate$ = createEffect(
  (
    actions$ = inject(Actions),
    currencyApi = inject(CurrencyApiService),
  ) =>
    actions$.pipe(
      ofType(CurrencyActions.loadRate),
      switchMap(({ from, to }) =>
        currencyApi.getRate(from, to).pipe(
          map(rate => CurrencyActions.loadRateSuccess({ from, to, rate })),
          catchError(error =>
            of(CurrencyActions.loadRateFailure({ error: String(error) })),
          ),
        ),
      ),
    ),
  { functional: true },
);

function rowToCurrency(row: unknown[]): ICurrency {
  return {
    currencyCode: String(row[1] ?? ''),
    name:         String(row[2] ?? ''),
    rateToBase:   Number(row[3] ?? 1),
    lastUpdated:  String(row[4] ?? new Date().toISOString()),
    source:       (String(row[5] ?? 'api') as 'api' | 'manual'),
  };
}

/** Load all persisted currencies + base_currency from Sheets in a single forkJoin. */
export const loadCurrencies$ = createEffect(
  (
    actions$ = inject(Actions),
    sheetsApi = inject(SheetsApiService),
    auth = inject(AuthService),
  ) =>
    actions$.pipe(
      ofType(CurrencyActions.loadCurrencies),
      switchMap(() => {
        const userId = auth.getUser()?.sub ?? '';
        return forkJoin([
          sheetsApi.getRange('CURRENCIES!A:F'),
          sheetsApi.getRange('USER_SETTINGS!A:D'),
        ]).pipe(
          map(([currenciesRes, settingsRes]) => {
            const currencyRows: unknown[][] = currenciesRes?.values?.slice(1) ?? [];
            const settingRows: unknown[][] = settingsRes?.values?.slice(1) ?? [];

            const currencies: ICurrency[] = [];
            const currencyRowMap: Record<string, number> = {};

            currencyRows.forEach((row, index) => {
              if (String(row[0]) !== userId) return;
              const currency = rowToCurrency(row);
              if (!currency.currencyCode) return;
              currencies.push(currency);
              // +2 because index is 0-based and row 1 is header
              currencyRowMap[currency.currencyCode] = index + 2;
            });

            let baseCurrency: string | null = null;
            let baseCurrencyRowNumber: number | null = null;

            settingRows.forEach((row, index) => {
              if (String(row[1]) === userId && String(row[2]) === 'base_currency') {
                baseCurrency = String(row[3] ?? '');
                baseCurrencyRowNumber = index + 2;
              }
            });

            return CurrencyActions.loadCurrenciesSuccess({
              currencies,
              currencyRowMap,
              baseCurrency,
              baseCurrencyRowNumber,
            });
          }),
          catchError(error =>
            of(CurrencyActions.loadCurrenciesFailure({
              error: error?.message ?? 'Error al cargar divisas',
            })),
          ),
        );
      }),
    ),
  { functional: true },
);

/** Fetch rate from ExchangeRate-API and persist to CURRENCIES sheet (upsert). */
export const fetchAndPersistRate$ = createEffect(
  (
    actions$ = inject(Actions),
    currencyApi = inject(CurrencyApiService),
    sheetsApi = inject(SheetsApiService),
    auth = inject(AuthService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(CurrencyActions.fetchAndPersistRate),
      withLatestFrom(store.select(selectCurrencyRowMap)),
      concatMap(([{ from, to }, rowMap]) => {
        const userId = auth.getUser()?.sub ?? '';
        return currencyApi.getRate(from, to).pipe(
          concatMap(rate => {
            const currency: ICurrency = {
              currencyCode: from,
              name: from,
              rateToBase: rate,
              lastUpdated: new Date().toISOString(),
              source: 'api',
            };
            const row = [userId, currency.currencyCode, currency.name, currency.rateToBase, currency.lastUpdated, currency.source];
            const existingRow = rowMap[from];

            const persist$ = existingRow
              ? sheetsApi.updateRow(`CURRENCIES!A${existingRow}:F${existingRow}`, [row])
              : sheetsApi.appendRow('CURRENCIES!A:F', [row]);

            return persist$.pipe(
              map((res: unknown) => {
                // appendRow returns updatedRange like 'CURRENCIES!A3:F3'; updateRow keeps existing row
                let rowNumber = existingRow ?? 0;
                if (!existingRow && res && typeof res === 'object' && 'updates' in res) {
                  const updates = (res as { updates?: { updatedRange?: string } }).updates;
                  const match = updates?.updatedRange?.match(/(\d+):/);
                  if (match) rowNumber = parseInt(match[1], 10);
                }
                return CurrencyActions.fetchAndPersistRateSuccess({ currency, rowNumber });
              }),
              catchError(error =>
                of(CurrencyActions.fetchAndPersistRateFailure({
                  error: error?.message ?? 'Error al persistir tasa',
                })),
              ),
            );
          }),
          catchError(error =>
            of(CurrencyActions.fetchAndPersistRateFailure({
              error: error?.message ?? 'Error al obtener tasa',
            })),
          ),
        );
      }),
    ),
  { functional: true },
);

/** Persist a manually entered currency rate to CURRENCIES sheet (upsert). */
export const saveCurrency$ = createEffect(
  (
    actions$ = inject(Actions),
    sheetsApi = inject(SheetsApiService),
    auth = inject(AuthService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(CurrencyActions.saveCurrency),
      withLatestFrom(store.select(selectCurrencyRowMap)),
      concatMap(([{ currency }, rowMap]) => {
        const userId = auth.getUser()?.sub ?? '';
        const row = [userId, currency.currencyCode, currency.name, currency.rateToBase, currency.lastUpdated, 'manual'];
        const existingRow = rowMap[currency.currencyCode];

        const persist$ = existingRow
          ? sheetsApi.updateRow(`CURRENCIES!A${existingRow}:F${existingRow}`, [row])
          : sheetsApi.appendRow('CURRENCIES!A:F', [row]);

        return persist$.pipe(
          map((res: unknown) => {
            let rowNumber = existingRow ?? 0;
            if (!existingRow && res && typeof res === 'object' && 'updates' in res) {
              const updates = (res as { updates?: { updatedRange?: string } }).updates;
              const match = updates?.updatedRange?.match(/(\d+):/);
              if (match) rowNumber = parseInt(match[1], 10);
            }
            return CurrencyActions.saveCurrencySuccess({
              currency: { ...currency, source: 'manual' },
              rowNumber,
            });
          }),
          catchError(error =>
            of(CurrencyActions.saveCurrencyFailure({
              error: error?.message ?? 'Error al guardar divisa',
            })),
          ),
        );
      }),
    ),
  { functional: true },
);

/** Update base_currency in USER_SETTINGS sheet (upsert). */
export const setBaseCurrency$ = createEffect(
  (
    actions$ = inject(Actions),
    sheetsApi = inject(SheetsApiService),
    auth = inject(AuthService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(CurrencyActions.setBaseCurrency),
      withLatestFrom(store.select(selectCurrencyState)),
      concatMap(([{ currencyCode }, currencyState]) => {
        const userId = auth.getUser()?.sub ?? '';
        const { baseCurrencyRowNumber } = currencyState;
        const settingId = `set_${crypto.randomUUID()}`;
        const row = [settingId, userId, 'base_currency', currencyCode];

        const persist$ = baseCurrencyRowNumber
          ? sheetsApi.updateRow(`USER_SETTINGS!A${baseCurrencyRowNumber}:D${baseCurrencyRowNumber}`, [row])
          : sheetsApi.appendRow('USER_SETTINGS!A:D', [row]);

        return persist$.pipe(
          map((res: unknown) => {
            let rowNumber = baseCurrencyRowNumber ?? 0;
            if (!baseCurrencyRowNumber && res && typeof res === 'object' && 'updates' in res) {
              const updates = (res as { updates?: { updatedRange?: string } }).updates;
              const match = updates?.updatedRange?.match(/(\d+):/);
              if (match) rowNumber = parseInt(match[1], 10);
            }
            return CurrencyActions.setBaseCurrencySuccess({ currencyCode, rowNumber });
          }),
          catchError(error =>
            of(CurrencyActions.setBaseCurrencyFailure({
              error: error?.message ?? 'Error al guardar moneda base',
            })),
          ),
        );
      }),
    ),
  { functional: true },
);
