import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IWallet } from '@models/wallet.model';
import { WalletService } from '@features/wallets/services/wallet.service';
import { AppendResponse } from '@features/transactions/services/transaction.service';
import { WorkspacesStateService } from '@core/state/workspaces.state';

@Injectable({ providedIn: 'root' })
export class WalletsStateService {
  private readonly walletService   = inject(WalletService);
  private readonly workspacesState = inject(WorkspacesStateService);

  private readonly _allItems = signal<IWallet[]>([]);
  private readonly _loading  = signal<boolean>(false);
  private readonly _error    = signal<string | null>(null);
  private readonly _rowMap   = signal<Record<string, number>>({});
  private readonly _loaded   = signal<boolean>(false);

  /** Todas las carteras del usuario, sin filtrar por workspace. */
  readonly allItems = this._allItems.asReadonly();
  /** Carteras del workspace activo. Las carteras sin workspaceId heredan el workspace default (retrocompatibilidad). */
  readonly items   = computed(() => {
    const activeId  = this.workspacesState.activeWorkspaceId();
    const defaultId = this.workspacesState.defaultWorkspaceId();
    return this._allItems().filter(w => (w.workspaceId || defaultId) === activeId);
  });
  readonly loading = this._loading.asReadonly();
  readonly error   = this._error.asReadonly();
  /** Mapa walletId → número de fila en Sheets. */
  readonly rowMap  = this._rowMap.asReadonly();

  load(force = false): Promise<void> {
    if (this._loaded() && !force) return Promise.resolve();
    this._loading.set(true);
    this._error.set(null);
    return firstValueFrom(this.walletService.loadWallets(this.workspacesState.defaultWorkspaceId()))
      .then(({ wallets, rowMap }) => {
        this._allItems.set(wallets);
        this._rowMap.set(rowMap);
        this._loaded.set(true);
      })
      .catch(err => this._error.set(String(err)))
      .finally(() => this._loading.set(false));
  }

  add(wallet: IWallet): void {
    const prevItems = this._allItems();
    this._allItems.update(items => [...items, wallet]);
    firstValueFrom(this.walletService.saveWallet(wallet))
      .then((response: AppendResponse) => {
        const rowNumber = this._parseRowNumber(response?.updates?.updatedRange);
        if (rowNumber) {
          this._rowMap.update(m => ({ ...m, [wallet.walletId]: rowNumber }));
        } else {
          this.load(true);
        }
      })
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }

  private _parseRowNumber(range: string | undefined): number | null {
    if (!range) return null;
    const match = range.match(/!A(\d+)/);
    return match ? Number(match[1]) : null;
  }

  update(wallet: IWallet, rowNumber: number): void {
    const prevItems = this._allItems();
    this._allItems.update(items => items.map(w => w.walletId === wallet.walletId ? wallet : w));
    firstValueFrom(this.walletService.updateWallet(wallet, rowNumber))
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }

  delete(walletId: string, rowNumber: number): void {
    const prevItems = this._allItems();
    this._allItems.update(items => items.filter(w => w.walletId !== walletId));
    firstValueFrom(this.walletService.deleteWallet(rowNumber))
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }
}
