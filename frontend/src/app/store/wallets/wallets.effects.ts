import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatMap, switchMap, map, catchError, withLatestFrom } from 'rxjs/operators';
import { of, EMPTY, merge } from 'rxjs';
import { WalletsActions } from './wallets.actions';
import { selectAllWallets } from './wallets.selectors';
import { WalletService } from '@features/wallets/services/wallet.service';
import { Store } from '@ngrx/store';

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
      concatMap(([{ wallet }, prevItems]) =>
        merge(
          of(WalletsActions.addWalletSuccess({ wallet })),
          walletService.saveWallet(wallet).pipe(
            switchMap(() => EMPTY),
            catchError(error =>
              of(WalletsActions.addWalletFailure({ error: String(error), prevItems })),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
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
      concatMap(([{ wallet, rowNumber }, prevItems]) =>
        merge(
          of(WalletsActions.updateWalletSuccess({ wallet })),
          walletService.updateWallet(wallet, rowNumber).pipe(
            switchMap(() => EMPTY),
            catchError(error =>
              of(WalletsActions.updateWalletFailure({ error: String(error), prevItems })),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
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
      concatMap(([{ walletId, rowNumber }, prevItems]) =>
        merge(
          of(WalletsActions.deleteWalletSuccess({ walletId })),
          walletService.deleteWallet(rowNumber).pipe(
            switchMap(() => EMPTY),
            catchError(error =>
              of(WalletsActions.deleteWalletFailure({ error: String(error), prevItems })),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
);
