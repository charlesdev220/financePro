import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IWallet } from '@models/wallet.model';
import { WalletService } from '@features/wallets/services/wallet.service';

@Injectable({ providedIn: 'root' })
export class WalletsStateService {
  private readonly walletService = inject(WalletService);

  private readonly _items   = signal<IWallet[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error   = signal<string | null>(null);
  private readonly _rowMap  = signal<Record<string, number>>({});

  /** Carteras del usuario. */
  readonly items   = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error   = this._error.asReadonly();
  /** Mapa walletId → número de fila en Sheets. */
  readonly rowMap  = this._rowMap.asReadonly();

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    firstValueFrom(this.walletService.loadWallets())
      .then(({ wallets, rowMap }) => {
        this._items.set(wallets);
        this._rowMap.set(rowMap);
      })
      .catch(err => this._error.set(String(err)))
      .finally(() => this._loading.set(false));
  }

  add(wallet: IWallet): void {
    const prevItems = this._items();
    this._items.update(items => [...items, wallet]);
    firstValueFrom(this.walletService.saveWallet(wallet))
      .catch(err => {
        this._items.set(prevItems);
        this._error.set(String(err));
      });
  }

  update(wallet: IWallet, rowNumber: number): void {
    const prevItems = this._items();
    this._items.update(items => items.map(w => w.walletId === wallet.walletId ? wallet : w));
    firstValueFrom(this.walletService.updateWallet(wallet, rowNumber))
      .catch(err => {
        this._items.set(prevItems);
        this._error.set(String(err));
      });
  }

  delete(walletId: string, rowNumber: number): void {
    const prevItems = this._items();
    this._items.update(items => items.filter(w => w.walletId !== walletId));
    firstValueFrom(this.walletService.deleteWallet(rowNumber))
      .catch(err => {
        this._items.set(prevItems);
        this._error.set(String(err));
      });
  }
}
