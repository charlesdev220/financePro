# Reglas NgRx v21 — MyFinance

## Estructura por feature

```
src/app/store/
├── transactions/
│   ├── transactions.actions.ts
│   ├── transactions.reducer.ts
│   ├── transactions.effects.ts
│   └── transactions.selectors.ts
├── wallets/
│   └── ...
├── categories/
│   └── ...
└── budgets/
    └── ...
```

## Actions — naming y tipado

```typescript
// transactions.actions.ts
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Transaction } from '@models/transaction.model';

export const TransactionsActions = createActionGroup({
  source: 'Transactions',
  events: {
    'Load Transactions':         emptyProps(),
    'Load Transactions Success': props<{ transactions: Transaction[] }>(),
    'Load Transactions Failure': props<{ error: string }>(),
    'Save Transaction':          props<{ transaction: Transaction }>(),
    'Save Transaction Success':  props<{ transaction: Transaction }>(),
    'Save Transaction Failure':  props<{ error: string }>(),
    'Delete Transaction':        props<{ id: string }>(),
    'Delete Transaction Success':props<{ id: string }>(),
    'Delete Transaction Failure':props<{ error: string }>(),
  },
});
```

## Reducers — funciones puras, sin efectos secundarios

```typescript
// transactions.reducer.ts
import { createFeature, createReducer, on } from '@ngrx/store';
import { TransactionsActions } from './transactions.actions';
import { Transaction } from '@models/transaction.model';

interface TransactionsState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}

const initialState: TransactionsState = {
  transactions: [],
  loading: false,
  error: null,
};

export const transactionsFeature = createFeature({
  name: 'transactions',
  reducer: createReducer(
    initialState,
    on(TransactionsActions.loadTransactions, state => ({
      ...state, loading: true, error: null,
    })),
    on(TransactionsActions.loadTransactionsSuccess, (state, { transactions }) => ({
      ...state, transactions, loading: false,
    })),
    on(TransactionsActions.loadTransactionsFailure, (state, { error }) => ({
      ...state, error, loading: false,
    })),
    on(TransactionsActions.deleteTransactionSuccess, (state, { id }) => ({
      ...state,
      transactions: state.transactions.filter(t => t.id !== id),
    })),
  ),
});
```

## Effects — único punto de contacto con SheetsApiService

```typescript
// transactions.effects.ts
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { TransactionsActions } from './transactions.actions';

export const loadTransactions$ = createEffect(
  (
    actions$ = inject(Actions),
    sheetsApi = inject(SheetsApiService),
  ) =>
    actions$.pipe(
      ofType(TransactionsActions.loadTransactions),
      switchMap(() =>
        sheetsApi.getTransactions().pipe(
          map(transactions =>
            TransactionsActions.loadTransactionsSuccess({ transactions })
          ),
          catchError(error =>
            of(TransactionsActions.loadTransactionsFailure({
              error: error.message ?? 'Error desconocido',
            }))
          ),
        )
      ),
    ),
  { functional: true },
);
```

- Effects funcionales (`{ functional: true }`) — no clases `@Injectable`.
- `switchMap` para lecturas (cancela petición anterior).
- `concatMap` para escrituras (preserva orden).
- `catchError` **siempre** dentro del `switchMap`/`concatMap` — nunca en el outer observable.

## Selectors — memoizados con createSelector

```typescript
// transactions.selectors.ts
import { createSelector } from '@ngrx/store';
import { transactionsFeature } from './transactions.reducer';

const { selectTransactions, selectLoading, selectError } =
  transactionsFeature;

export const selectIncomes = createSelector(
  selectTransactions,
  txs => txs.filter(t => t.type === TRANSACTION_TYPES.INCOME)
);

export const selectTotalBalance = createSelector(
  selectTransactions,
  txs => txs.reduce((sum, t) =>
    t.type === TRANSACTION_TYPES.INCOME ? sum + t.amount_base : sum - t.amount_base, 0
  )
);

export {
  selectTransactions,
  selectLoading as selectTransactionsLoading,
  selectError  as selectTransactionsError,
};
```

## Consumo en componentes — toSignal()

```typescript
// En el componente, nunca subscribe() al store
private store = inject(Store);

transactions = toSignal(
  this.store.select(selectTransactions),
  { initialValue: [] }
);
loading = toSignal(
  this.store.select(selectTransactionsLoading),
  { initialValue: false }
);

// Dispatch
onLoad() {
  this.store.dispatch(TransactionsActions.loadTransactions());
}
```

## Registro de Effects y Reducers

```typescript
// app.config.ts
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { transactionsFeature } from '@store/transactions/transactions.reducer';
import * as transactionsEffects from '@store/transactions/transactions.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStore({
      [transactionsFeature.name]: transactionsFeature.reducer,
    }),
    provideEffects(transactionsEffects),
    provideStoreDevtools({ maxAge: 25 }),
  ],
};
```

## Restricciones

- Reducers son funciones puras — **ningún efecto secundario** (no llamar a servicios, no mutar estado).
- Effects son el **único lugar** autorizado para llamar a `SheetsApiService`.
- No `dispatch` desde templates — solo desde métodos del componente.
- No selectors ad hoc en componentes (`store.select(state => state.transactions.list)`) — usar siempre selectors tipados.
- No `ngrxOnInitEffects` salvo que sea estrictamente necesario — preferir dispatch en `ngOnInit`.
