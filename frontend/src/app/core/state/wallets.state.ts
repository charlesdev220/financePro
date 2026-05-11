import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, map, Observable } from 'rxjs';
import { IWallet } from '@models/wallet.model';
import { rowToWallet, walletToRow } from '@features/wallets/services/wallet.service';
import { AppendResponse } from '@features/transactions/services/transaction.service';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
import { WorkspacesStateService } from '@core/state/workspaces.state';

@Injectable({ providedIn: 'root' })
export class WalletsStateService {
  private readonly sheetsApi = inject(SheetsApiService);
  private readonly authService = inject(AuthService);
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
    const defaultWsId = this.workspacesState.defaultWorkspaceId();
    this._loading.set(true);
    this._error.set(null);
    return firstValueFrom(
      this.sheetsApi.getRange('WALLETS!A:J').pipe(
        map(response => {
          if (!response?.values || response.values.length < 2) return { wallets: [], rowMap: {} };
          const allRows = response.values.slice(1);
          const userId = this.authService.getUser()?.sub ?? '';
          const rowMap: Record<string, number> = {};
          allRows.forEach((row, i) => {
            const id = String(row[0] ?? '');
            const uid = String(row[1] ?? '');
            if (id && uid === userId) rowMap[id] = i + 2;
          });
          const wallets = allRows
            .filter(row => row[0] && String(row[1] ?? '') === userId)
            .map(row => rowToWallet(row, defaultWsId));
          return { wallets, rowMap };
        }),
      ),
    )
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
    firstValueFrom(this.sheetsApi.appendRow('WALLETS!A1', [walletToRow(wallet)]) as Observable<AppendResponse>)
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
    firstValueFrom(this.sheetsApi.updateRow(`WALLETS!A${rowNumber}:J${rowNumber}`, [walletToRow(wallet)]))
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }

  delete(walletId: string, rowNumber: number): void {
    const prevItems = this._allItems();
    this._allItems.update(items => items.filter(w => w.walletId !== walletId));
    firstValueFrom(this.sheetsApi.deleteRow(`WALLETS!A${rowNumber}:J${rowNumber}`))
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }
}
