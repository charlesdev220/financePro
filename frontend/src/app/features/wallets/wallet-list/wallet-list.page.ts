import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonBadge, IonSpinner,
  IonFab, IonFabButton, IonIcon, IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, createOutline } from 'ionicons/icons';
import { WalletsStateService } from '@core/state/wallets.state';
import { TransactionsStateService } from '@core/state/transactions.state';
import { IWallet } from '@models/wallet.model';
import { AuthService } from '@core/services/auth.service';
import { WalletFormComponent } from '@features/wallets/wallet-form/wallet-form.component';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';
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
  private readonly walletsState    = inject(WalletsStateService);
  private readonly txState         = inject(TransactionsStateService);
  private readonly modalCtrl       = inject(ModalController);
  private readonly toastCtrl       = inject(ToastController);
  private readonly authService     = inject(AuthService);

  /** Estado de carga de carteras para mostrar spinner mientras llegan del state service. */
  readonly loading = this.walletsState.loading;
  /** Carteras del usuario para renderizar la lista. */
  readonly wallets = this.walletsState.items;
  /** Mapa walletId → rowNumber en Sheets, necesario para edición y borrado. */
  private readonly rowMap = this.walletsState.rowMap;
  /** Todas las transacciones, base para calcular balances por cartera. */
  private readonly allTransactions = this.txState.items;

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
    this.walletsState.load();
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
    this.walletsState.delete(wallet.walletId, rowNumber);
    const toast = await this.toastCtrl.create({
      message: 'Cartera eliminada',
      duration: 2000,
      color: 'medium',
    });
    await toast.present();
  }
}
