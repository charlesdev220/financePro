import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CurrencyActions } from './currency.actions';
import { CurrencyApiService } from '../../core/services/currency-api.service';

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
