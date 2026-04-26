import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ICurrency } from '@models/currency.model';
import { CurrencyApiService } from '@core/services/currency-api.service';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';

function rowToCurrency(row: unknown[]): ICurrency {
  return {
    currencyCode: String(row[1] ?? ''),
    name:         String(row[2] ?? ''),
    rateToBase:   Number(row[3] ?? 1),
    lastUpdated:  String(row[4] ?? new Date().toISOString()),
    source:       (String(row[5] ?? 'api') as 'api' | 'manual'),
  };
}

@Injectable({ providedIn: 'root' })
export class CurrencyStateService {
  private readonly currencyApi = inject(CurrencyApiService);
  private readonly sheetsApi   = inject(SheetsApiService);
  private readonly auth        = inject(AuthService);

  private readonly _items                  = signal<ICurrency[]>([]);
  private readonly _loading                = signal<boolean>(false);
  private readonly _error                  = signal<string | null>(null);
  private readonly _rowMap                 = signal<Record<string, number>>({});
  private readonly _baseCurrency           = signal<string | null>(null);
  private readonly _baseCurrencyRowNumber  = signal<number | null>(null);

  /** Divisas persistidas del usuario. */
  readonly items                 = this._items.asReadonly();
  readonly loading               = this._loading.asReadonly();
  readonly error                 = this._error.asReadonly();
  /** Mapa currencyCode → número de fila en Sheets. */
  readonly rowMap                = this._rowMap.asReadonly();
  /** Código de la moneda base del usuario. */
  readonly baseCurrency          = this._baseCurrency.asReadonly();
  readonly baseCurrencyRowNumber = this._baseCurrencyRowNumber.asReadonly();

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    const userId = this.auth.getUser()?.sub ?? '';
    firstValueFrom(
      forkJoin([
        this.sheetsApi.getRange('CURRENCIES!A:F'),
        this.sheetsApi.getRange('USER_SETTINGS!A:D'),
      ]),
    )
      .then(([currenciesRes, settingsRes]) => {
        const currencyRows: unknown[][] = currenciesRes?.values?.slice(1) ?? [];
        const settingRows:  unknown[][] = settingsRes?.values?.slice(1)  ?? [];

        const currencies: ICurrency[] = [];
        const currencyRowMap: Record<string, number> = {};
        currencyRows.forEach((row, index) => {
          if (String(row[0]) !== userId) return;
          const currency = rowToCurrency(row);
          if (!currency.currencyCode) return;
          currencies.push(currency);
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

        this._items.set(currencies);
        this._rowMap.set(currencyRowMap);
        this._baseCurrency.set(baseCurrency);
        this._baseCurrencyRowNumber.set(baseCurrencyRowNumber);
      })
      .catch(err => this._error.set(err?.message ?? String(err)))
      .finally(() => this._loading.set(false));
  }

  fetchAndPersistRate(from: string, to: string): void {
    const existingRow = this._rowMap()[from];
    firstValueFrom(this.currencyApi.getRate(from, to))
      .then(rate => {
        const currency: ICurrency = {
          currencyCode: from,
          name:         from,
          rateToBase:   rate,
          lastUpdated:  new Date().toISOString(),
          source:       'api',
        };
        const userId = this.auth.getUser()?.sub ?? '';
        const row = [userId, currency.currencyCode, currency.name, currency.rateToBase, currency.lastUpdated, currency.source];

        const persist$ = existingRow
          ? this.sheetsApi.updateRow(`CURRENCIES!A${existingRow}:F${existingRow}`, [row])
          : this.sheetsApi.appendRow('CURRENCIES!A:F', [row]);

        return firstValueFrom(persist$).then(res => {
          let rowNumber = existingRow ?? 0;
          if (!existingRow && res && typeof res === 'object' && 'updates' in res) {
            const updates = (res as { updates?: { updatedRange?: string } }).updates;
            const match = updates?.updatedRange?.match(/(\d+):/);
            if (match) rowNumber = parseInt(match[1], 10);
          }
          this._items.update(items => {
            const idx = items.findIndex(c => c.currencyCode === from);
            return idx >= 0
              ? items.map(c => c.currencyCode === from ? currency : c)
              : [...items, currency];
          });
          if (rowNumber) {
            this._rowMap.update(m => ({ ...m, [from]: rowNumber }));
          }
        });
      })
      .catch(err => this._error.set(err?.message ?? String(err)));
  }

  saveCurrency(currency: ICurrency): void {
    const existingRow = this._rowMap()[currency.currencyCode];
    const userId = this.auth.getUser()?.sub ?? '';
    const row = [userId, currency.currencyCode, currency.name, currency.rateToBase, currency.lastUpdated, 'manual'];

    const persist$ = existingRow
      ? this.sheetsApi.updateRow(`CURRENCIES!A${existingRow}:F${existingRow}`, [row])
      : this.sheetsApi.appendRow('CURRENCIES!A:F', [row]);

    const updated: ICurrency = { ...currency, source: 'manual' };
    firstValueFrom(persist$)
      .then(res => {
        let rowNumber = existingRow ?? 0;
        if (!existingRow && res && typeof res === 'object' && 'updates' in res) {
          const updates = (res as { updates?: { updatedRange?: string } }).updates;
          const match = updates?.updatedRange?.match(/(\d+):/);
          if (match) rowNumber = parseInt(match[1], 10);
        }
        this._items.update(items => {
          const idx = items.findIndex(c => c.currencyCode === currency.currencyCode);
          return idx >= 0
            ? items.map(c => c.currencyCode === currency.currencyCode ? updated : c)
            : [...items, updated];
        });
        if (rowNumber) {
          this._rowMap.update(m => ({ ...m, [currency.currencyCode]: rowNumber }));
        }
      })
      .catch(err => this._error.set(err?.message ?? String(err)));
  }

  setBaseCurrency(currencyCode: string): void {
    const baseCurrencyRowNumber = this._baseCurrencyRowNumber();
    const userId = this.auth.getUser()?.sub ?? '';
    const settingId = `set_${crypto.randomUUID()}`;
    const row = [settingId, userId, 'base_currency', currencyCode];

    const persist$ = baseCurrencyRowNumber
      ? this.sheetsApi.updateRow(`USER_SETTINGS!A${baseCurrencyRowNumber}:D${baseCurrencyRowNumber}`, [row])
      : this.sheetsApi.appendRow('USER_SETTINGS!A:D', [row]);

    firstValueFrom(persist$)
      .then(res => {
        let rowNumber = baseCurrencyRowNumber ?? 0;
        if (!baseCurrencyRowNumber && res && typeof res === 'object' && 'updates' in res) {
          const updates = (res as { updates?: { updatedRange?: string } }).updates;
          const match = updates?.updatedRange?.match(/(\d+):/);
          if (match) rowNumber = parseInt(match[1], 10);
        }
        this._baseCurrency.set(currencyCode);
        if (rowNumber) this._baseCurrencyRowNumber.set(rowNumber);
      })
      .catch(err => this._error.set(err?.message ?? String(err)));
  }
}
