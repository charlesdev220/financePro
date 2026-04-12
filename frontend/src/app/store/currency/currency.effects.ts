import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CurrencyActions } from './currency.actions';
import { CurrencyApiService } from '../../core/services/currency-api.service';

@Injectable()
export class CurrencyEffects {
  private readonly actions$ = inject(Actions);
  private readonly currencyApi = inject(CurrencyApiService);

  loadRate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CurrencyActions.loadRate),
      switchMap(({ from, to }) =>
        this.currencyApi.getRate(from, to).pipe(
          map(rate => CurrencyActions.loadRateSuccess({ from, to, rate })),
          catchError(error =>
            of(CurrencyActions.loadRateFailure({ error: String(error) })),
          ),
        ),
      ),
    ),
  );
}
