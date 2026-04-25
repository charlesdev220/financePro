import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { ICurrency } from '@models/currency.model';

export const CurrencyActions = createActionGroup({
  source: 'Currency',
  events: {
    // Existing — do not remove
    'Load Rate':         props<{ from: string; to: string }>(),
    'Load Rate Success': props<{ from: string; to: string; rate: number }>(),
    'Load Rate Failure': props<{ error: string }>(),

    // Load all persisted currencies + base currency from Sheets
    'Load Currencies':         emptyProps(),
    'Load Currencies Success': props<{
      currencies: ICurrency[];
      currencyRowMap: Record<string, number>;
      baseCurrency: string | null;
      baseCurrencyRowNumber: number | null;
    }>(),
    'Load Currencies Failure': props<{ error: string }>(),

    // Fetch rate from ExchangeRate-API and persist to CURRENCIES sheet
    'Fetch And Persist Rate':         props<{ from: string; to: string }>(),
    'Fetch And Persist Rate Success': props<{ currency: ICurrency; rowNumber: number }>(),
    'Fetch And Persist Rate Failure': props<{ error: string }>(),

    // Persist a manually entered rate to CURRENCIES sheet
    'Save Currency':         props<{ currency: ICurrency }>(),
    'Save Currency Success': props<{ currency: ICurrency; rowNumber: number }>(),
    'Save Currency Failure': props<{ error: string }>(),

    // Update base_currency in USER_SETTINGS sheet
    'Set Base Currency':         props<{ currencyCode: string }>(),
    'Set Base Currency Success': props<{ currencyCode: string; rowNumber: number }>(),
    'Set Base Currency Failure': props<{ error: string }>(),
  },
});
