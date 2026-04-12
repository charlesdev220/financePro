import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { concatMap, switchMap, map, catchError, tap, withLatestFrom } from 'rxjs';
import { of, EMPTY } from 'rxjs';
import { WalletsActions } from './wallets.actions';
import { selectAllWallets } from './wallets.selectors';
import { WalletService } from '../../features/wallets/services/wallet.service';

@Injectable()
export class WalletsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly walletService = inject(WalletService);

  loadWallets$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WalletsActions.loadWallets),
      switchMap(() =>
        this.walletService.loadWallets().pipe(
          map(({ wallets, rowMap }) =>
            WalletsActions.loadWalletsSuccess({ wallets, rowMap }),
          ),
          catchError(error =>
            of(WalletsActions.loadWalletsFailure({ error: String(error) })),
          ),
        ),
      ),
    ),
  );

  addWallet$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WalletsActions.addWallet),
      withLatestFrom(this.store.select(selectAllWallets)),
      concatMap(([{ wallet }, prevItems]) => {
        this.store.dispatch(WalletsActions.addWalletSuccess({ wallet }));
        return this.walletService.saveWallet(wallet).pipe(
          catchError(error => {
            this.store.dispatch(
              WalletsActions.addWalletFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
    { dispatch: false },
  );

  updateWallet$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WalletsActions.updateWallet),
      withLatestFrom(this.store.select(selectAllWallets)),
      concatMap(([{ wallet, rowNumber }, prevItems]) => {
        this.store.dispatch(WalletsActions.updateWalletSuccess({ wallet }));
        return this.walletService.updateWallet(wallet, rowNumber).pipe(
          catchError(error => {
            this.store.dispatch(
              WalletsActions.updateWalletFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
    { dispatch: false },
  );

  deleteWallet$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WalletsActions.deleteWallet),
      withLatestFrom(this.store.select(selectAllWallets)),
      concatMap(([{ walletId, rowNumber }, prevItems]) => {
        this.store.dispatch(WalletsActions.deleteWalletSuccess({ walletId }));
        return this.walletService.deleteWallet(rowNumber).pipe(
          catchError(error => {
            this.store.dispatch(
              WalletsActions.deleteWalletFailure({ error: String(error), prevItems }),
            );
            return EMPTY;
          }),
        );
      }),
    ),
    { dispatch: false },
  );
}
