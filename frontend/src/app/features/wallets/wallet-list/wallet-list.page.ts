import { Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonList, IonItem, IonLabel, IonNote,
  IonFab, IonFabButton, IonIcon, IonButton, IonButtons, IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, createOutline } from 'ionicons/icons';
import { WalletsActions } from '../../../store/wallets/wallets.actions';
import { selectAllWallets, selectWalletsRowMap, selectBalanceForWallet } from '../../../store/wallets/wallets.selectors';
import { IWallet } from '../../../models/wallet.model';
import { AuthService } from '../../../core/services/auth.service';
import { WalletFormComponent } from '../wallet-form/wallet-form.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { AppState } from '../../../store/app.state';

@Component({
  selector: 'app-wallet-list',
  templateUrl: 'wallet-list.page.html',
  styleUrls: ['wallet-list.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonList, IonItem, IonLabel, IonNote,
    IonFab, IonFabButton, IonIcon, IonButton, IonButtons, IonBadge,
    CurrencyFormatPipe,
  ],
})
export class WalletListPage implements OnInit {
  private readonly store = inject(Store<AppState>);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly authService = inject(AuthService);

  readonly wallets = toSignal(this.store.select(selectAllWallets), { initialValue: [] });
  private readonly rowMap = toSignal(this.store.select(selectWalletsRowMap), { initialValue: {} as Record<string, number> });

  constructor() {
    addIcons({ addOutline, trashOutline, createOutline });
  }

  ngOnInit(): void {
    this.store.dispatch(WalletsActions.loadWallets());
  }

  getBalance(walletId: string): number {
    let balance = 0;
    this.store.select(selectBalanceForWallet(walletId)).subscribe(b => (balance = b)).unsubscribe();
    return balance;
  }

  async openAddModal(): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;
    const modal = await this.modalCtrl.create({
      component: WalletFormComponent,
      componentProps: { userId: user.sub },
      backdropDismiss: false,
    });
    await modal.present();
  }

  async openEditModal(wallet: IWallet): Promise<void> {
    const rowNumber = this.rowMap()[wallet.walletId];
    const modal = await this.modalCtrl.create({
      component: WalletFormComponent,
      componentProps: { wallet, rowNumber },
      backdropDismiss: false,
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
