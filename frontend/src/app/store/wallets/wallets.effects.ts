import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { concatMap, switchMap, map, catchError, withLatestFrom } from 'rxjs/operators';
import { of, EMPTY } from 'rxjs';
import { WalletsActions } from './wallets.actions';
import { selectAllWallets } from './wallets.selectors';
import { WalletService } from '../../features/wallets/services/wallet.service';

export const loadWallets$ = createEffect(
  (
    actions$ = inject(Actions),
    walletService = inject(WalletService),
  ) =>
    actions$.pipe(
      ofType(WalletsActions.loadWallets),
      switchMap(() =>
        walletService.loadWallets().pipe(
          map(({ wallets, rowMap }) =>
            WalletsActions.loadWalletsSuccess({ wallets, rowMap }),
          ),
          catchError(error =>
            of(WalletsActions.loadWalletsFailure({ error: String(error) })),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const addWallet$ = createEffect(
  (
    actions$ = inject(Actions),
    walletService = inject(WalletService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(WalletsActions.addWallet),
      withLatestFrom(store.select(selectAllWallets)),
      concatMap(([{ wallet }, prevItems]) => {
        store.dispatch(WalletsActions.addWalletSuccess({ wallet }));
        return walletService.saveWallet(wallet).pipe(
          catchError(error => {
            store.dispatch(
              WalletsActions.addWalletFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
  { functional: true, dispatch: false },
);

export const updateWallet$ = createEffect(
  (
    actions$ = inject(Actions),
    walletService = inject(WalletService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(WalletsActions.updateWallet),
      withLatestFrom(store.select(selectAllWallets)),
      concatMap(([{ wallet, rowNumber }, prevItems]) => {
        store.dispatch(WalletsActions.updateWalletSuccess({ wallet }));
        return walletService.updateWallet(wallet, rowNumber).pipe(
          catchError(error => {
            store.dispatch(
              WalletsActions.updateWalletFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
  { functional: true, dispatch: false },
);

export const deleteWallet$ = createEffect(
  (
    actions$ = inject(Actions),
    walletService = inject(WalletService),
    store = inject(Store),
  ) =>
    actions$.pipe(
      ofType(WalletsActions.deleteWallet),
      withLatestFrom(store.select(selectAllWallets)),
      concatMap(([{ walletId, rowNumber }, prevItems]) => {
        store.dispatch(WalletsActions.deleteWalletSuccess({ walletId }));
        return walletService.deleteWallet(rowNumber).pipe(
          catchError(error => {
            store.dispatch(
              WalletsActions.deleteWalletFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
  { functional: true, dispatch: false },
);
