import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonBadge, IonSpinner,
  IonFab, IonFabButton, IonIcon, IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, createOutline } from 'ionicons/icons';
import { WalletsActions } from '@store/wallets/wallets.actions';
import { selectAllWallets, selectWalletsRowMap, selectWalletsLoading } from '@store/wallets/wallets.selectors';
import { selectAllTransactions } from '@store/transactions/transactions.selectors';
import { IWallet } from '@models/wallet.model';
import { AuthService } from '@core/services/auth.service';
import { WalletFormComponent } from '@features/wallets/wallet-form/wallet-form.component';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';
import { AppState } from '@store/app.state';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

@Component({
  selector: 'app-wallet-list',
  templateUrl: 'wallet-list.page.html',
  styleUrls: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonBadge, IonSpinner,
    IonFab, IonFabButton, IonIcon, IonButton,
    CurrencyFormatPipe,
  ],
})
export class WalletListPage implements OnInit {
  private readonly store       = inject(Store<AppState>);
  private readonly modalCtrl   = inject(ModalController);
  private readonly toastCtrl   = inject(ToastController);
  private readonly authService = inject(AuthService);

  /** Estado de carga de carteras para mostrar spinner mientras llegan del store. */
  readonly loading = toSignal(this.store.select(selectWalletsLoading), { initialValue: false });
  /** Carteras del usuario para renderizar la lista. */
  readonly wallets  = toSignal(this.store.select(selectAllWallets),  { initialValue: [] });
  /** Mapa walletId → rowNumber en Sheets, necesario para edición y borrado. */
  private readonly rowMap = toSignal(this.store.select(selectWalletsRowMap), { initialValue: {} as Record<string, number> });
  /** Todas las transacciones del store, base para calcular balances por cartera. */
  private readonly allTransactions = toSignal(this.store.select(selectAllTransactions), { initialValue: [] });

  /** Balance acumulado por cartera (walletId → número): income suma, expense resta en divisa nativa. */
  readonly balanceMap = computed(() =>
    this.allTransactions().reduce((map, t) => {
      const current = map[t.walletId] ?? 0;
      map[t.walletId] = t.type === TRANSACTION_TYPES.INCOME ? current + t.amount : current - t.amount;
      return map;
    }, {} as Record<string, number>),
  );

  constructor() {
    addIcons({ addOutline, trashOutline, createOutline });
  }

  ngOnInit(): void {
    this.store.dispatch(WalletsActions.loadWallets());
  }

  getBalance(walletId: string): number {
    return this.balanceMap()[walletId] ?? 0;
  }

  async openAddModal(): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;
    const modal = await this.modalCtrl.create({
      component: WalletFormComponent,
      componentProps: { userId: user.sub },
      backdropDismiss: true,
    });
    await modal.present();
  }

  async openEditModal(wallet: IWallet): Promise<void> {
    const rowNumber = this.rowMap()[wallet.walletId];
    const modal = await this.modalCtrl.create({
      component: WalletFormComponent,
      componentProps: { wallet, rowNumber },
      backdropDismiss: true,
    });
    await modal.present();
  }

  async deleteWallet(wallet: IWallet): Promise<void> {
    const rowNumber = this.rowMap()[wallet.walletId];
    if (!rowNumber) return;
    this.store.dispatch(WalletsActions.deleteWallet({ walletId: wallet.walletId, rowNumber }));
    const toast = await this.toastCtrl.create({
      message: 'Cartera eliminada',
      duration: 2000,
      color: 'medium',
    });
    await toast.present();
  }
}
