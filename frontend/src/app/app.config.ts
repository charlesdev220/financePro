import { ApplicationConfig, isDevMode, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { transactionsReducer } from './store/transactions/transactions.reducer';
import { walletsReducer } from './store/wallets/wallets.reducer';
import { budgetsReducer } from './store/budgets/budgets.reducer';
import { TransactionsEffects } from './store/transactions/transactions.effects';
import { WalletsEffects } from './store/wallets/wallets.effects';
import { BudgetsEffects } from './store/budgets/budgets.effects';

export function initializeApp(authService: AuthService) {
  return () => authService.signIn();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideIonicAngular(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    },
    provideStore({
      transactions: transactionsReducer,
      wallets: walletsReducer,
      budgets: budgetsReducer,
    }),
    provideEffects([TransactionsEffects, WalletsEffects, BudgetsEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
  ],
};
