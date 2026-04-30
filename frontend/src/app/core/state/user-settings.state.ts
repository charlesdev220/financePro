import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';

const DEFAULT_CATEGORY_BUDGET = 200;
const DEFAULT_MONTH_START_DAY = 1;

@Injectable({ providedIn: 'root' })
export class UserSettingsStateService {
  private readonly sheetsApi = inject(SheetsApiService);
  private readonly auth      = inject(AuthService);

  private readonly _defaultCategoryBudget = signal<number>(DEFAULT_CATEGORY_BUDGET);
  private readonly _monthStartDay         = signal<number>(DEFAULT_MONTH_START_DAY);
  private readonly _loading               = signal<boolean>(false);
  private readonly _error                 = signal<string | null>(null);
  private _defaultBudgetRowNumber: number | null = null;
  private _defaultBudgetSettingId: string        = '';
  private _monthStartDayRowNumber: number | null = null;
  private _monthStartDaySettingId: string        = '';

  /** Monto mensual por defecto para presupuestos de categoría. Fallback: 200. */
  readonly defaultCategoryBudget = this._defaultCategoryBudget.asReadonly();
  /** Día del mes en que comienza el período mensual del usuario. Rango 1–28. Fallback: 1. */
  readonly monthStartDay = this._monthStartDay.asReadonly();
  readonly loading       = this._loading.asReadonly();
  readonly error         = this._error.asReadonly();

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    const userId = this.auth.getUser()?.sub ?? '';
    firstValueFrom(this.sheetsApi.getRange('USER_SETTINGS!A:D'))
      .then(response => {
        const rows: unknown[][] = response?.values?.slice(1) ?? [];
        rows.forEach((row, index) => {
          if (String(row[1]) !== userId) return;
          const key = String(row[2]);
          if (key === 'default_category_budget') {
            const val = Number(row[3]);
            if (!isNaN(val) && val > 0) {
              this._defaultCategoryBudget.set(val);
            }
            this._defaultBudgetSettingId = String(row[0] ?? '');
            this._defaultBudgetRowNumber = index + 2;
          } else if (key === 'month_start_day') {
            const val = Number(row[3]);
            if (!isNaN(val) && val >= 1 && val <= 28) {
              this._monthStartDay.set(val);
            }
            this._monthStartDaySettingId = String(row[0] ?? '');
            this._monthStartDayRowNumber = index + 2;
          }
        });
      })
      .catch(err => this._error.set(err?.message ?? String(err)))
      .finally(() => this._loading.set(false));
  }

  saveDefaultBudget(amount: number): void {
    if (amount <= 0) return;
    const userId   = this.auth.getUser()?.sub ?? '';
    const settingId = this._defaultBudgetSettingId || `set_${crypto.randomUUID()}`;
    const row = [settingId, userId, 'default_category_budget', String(amount)];

    const persist$ = this._defaultBudgetRowNumber
      ? this.sheetsApi.updateRow(`USER_SETTINGS!A${this._defaultBudgetRowNumber}:D${this._defaultBudgetRowNumber}`, [row])
      : this.sheetsApi.appendRow('USER_SETTINGS!A:D', [row]);

    firstValueFrom(persist$)
      .then(res => {
        this._defaultCategoryBudget.set(amount);
        this._defaultBudgetSettingId = settingId;
        if (!this._defaultBudgetRowNumber && res && typeof res === 'object' && 'updates' in res) {
          const updates = (res as { updates?: { updatedRange?: string } }).updates;
          const match = updates?.updatedRange?.match(/(\d+):/);
          if (match) this._defaultBudgetRowNumber = parseInt(match[1], 10);
        }
      })
      .catch(err => this._error.set(err?.message ?? String(err)));
  }

  saveMonthStartDay(day: number): void {
    if (day < 1 || day > 28) return;
    const userId    = this.auth.getUser()?.sub ?? '';
    const settingId = this._monthStartDaySettingId || `set_${crypto.randomUUID()}`;
    const row = [settingId, userId, 'month_start_day', String(day)];

    const persist$ = this._monthStartDayRowNumber
      ? this.sheetsApi.updateRow(`USER_SETTINGS!A${this._monthStartDayRowNumber}:D${this._monthStartDayRowNumber}`, [row])
      : this.sheetsApi.appendRow('USER_SETTINGS!A:D', [row]);

    firstValueFrom(persist$)
      .then(res => {
        this._monthStartDay.set(day);
        this._monthStartDaySettingId = settingId;
        if (!this._monthStartDayRowNumber && res && typeof res === 'object' && 'updates' in res) {
          const updates = (res as { updates?: { updatedRange?: string } }).updates;
          const match = updates?.updatedRange?.match(/(\d+):/);
          if (match) this._monthStartDayRowNumber = parseInt(match[1], 10);
        }
      })
      .catch(err => this._error.set(err?.message ?? String(err)));
  }
}
