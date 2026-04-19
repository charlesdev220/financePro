import { ApplicationConfig, isDevMode, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';

import { transactionsReducer } from './store/transactions/transactions.reducer';
import { walletsReducer } from './store/wallets/wallets.reducer';
import { budgetsReducer } from './store/budgets/budgets.reducer';
import { categoriesReducer } from './store/categories/categories.reducer';
import { currencyReducer } from './store/currency/currency.reducer';
import * as transactionsEffects from './store/transactions/transactions.effects';
import * as walletsEffects from './store/wallets/wallets.effects';
import * as budgetsEffects from './store/budgets/budgets.effects';
import * as categoriesEffects from './store/categories/categories.effects';
import * as currencyEffects from './store/currency/currency.effects';

export function initializeApp(authService: AuthService) {
  return () => authService.signIn();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    provideIonicAngular(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true,
    },
    provideStore({
      transactions: transactionsReducer,
      wallets: walletsReducer,
      budgets: budgetsReducer,
      categories: categoriesReducer,
      currency: currencyReducer,
    }),
    provideEffects(
      transactionsEffects,
      walletsEffects,
      budgetsEffects,
      categoriesEffects,
      currencyEffects,
    ),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
  ],
};
