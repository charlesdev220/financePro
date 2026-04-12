import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription, filter, skip } from 'rxjs';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonFab,
  IonFabButton,
  IonSelect,
  IonSelectOption,
  IonNote,
  IonItemSliding,
  IonItemOption,
  IonItemOptions,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, createOutline, arrowUpOutline, arrowDownOutline } from 'ionicons/icons';
import { TransactionsActions } from '../../../store/transactions/transactions.actions';
import {
  selectAllTransactions,
  selectTransactionsRowMap,
  selectTransactionsError,
} from '../../../store/transactions/transactions.selectors';
import { selectAllWallets } from '../../../store/wallets/wallets.selectors';
import { selectActiveCategories } from '../../../store/categories/categories.selectors';
import { AuthService } from '../../../core/services/auth.service';
import { ITransaction } from '../../../models/transaction.model';
import { RelativeDatePipe } from '../../../shared/pipes/relative-date.pipe';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';

@Component({
  selector: 'app-transaction-list',
  templateUrl: 'transaction-list.page.html',
  styleUrls: ['transaction-list.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonBadge, IonNote,
    IonFab, IonFabButton,
    IonSelect, IonSelectOption,
    IonItemSliding, IonItemOption, IonItemOptions,
    RelativeDatePipe, CurrencyFormatPipe,
  ],
})
export class TransactionListPage implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly authService = inject(AuthService);

  readonly filterWallet = signal<string>('');
  readonly filterCategory = signal<string>('');

  readonly error = toSignal(this.store.select(selectTransactionsError), { initialValue: null });

  private errorSub: Subscription | null = null;

  private readonly allTransactions = toSignal(
    this.store.select(selectAllTransactions), { initialValue: [] },
  );
  readonly wallets = toSignal(this.store.select(selectAllWallets), { initialValue: [] });
  readonly categories = toSignal(this.store.select(selectActiveCategories), { initialValue: [] });
  private readonly rowMap = toSignal(this.store.select(selectTransactionsRowMap), { initialValue: {} as Record<string, number> });

  readonly transactions = computed(() => {
    const userId = this.authService.getUser()?.sub ?? '';
    let txs = this.allTransactions().filter(t => t.userId === userId);
    if (this.filterWallet()) txs = txs.filter(t => t.walletId === this.filterWallet());
    if (this.filterCategory()) txs = txs.filter(t => t.categoryId === this.filterCategory());
    return txs.slice().sort((a, b) => b.date.localeCompare(a.date));
  });

  readonly hasTransactions = computed(() => this.transactions().length > 0);
  readonly activeFilters = computed(() => !!(this.filterWallet() || this.filterCategory()));

  constructor() {
    addIcons({ addOutline, trashOutline, createOutline, arrowUpOutline, arrowDownOutline });
  }

  ngOnInit(): void {
    this.store.dispatch(TransactionsActions.loadTransactions());
    // REQ-06 sc2: mostrar toast de error cuando una operación falla (después del rollback)
    this.errorSub = this.store
      .select(selectTransactionsError)
      .pipe(skip(1), filter(e => !!e))
      .subscribe(async err => {
        const toast = await this.toastCtrl.create({
          message: `Error: ${err}`,
          duration: 3000,
          color: 'danger',
        });
        await toast.present();
      });
  }

  ngOnDestroy(): void {
    this.errorSub?.unsubscribe();
  }

  async openAddModal(): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;
    const modal = await this.modalCtrl.create({
      component: TransactionFormComponent,
      componentProps: { userId: user.sub, userBaseCurrency: 'EUR' },
    });
    await modal.present();
  }

  async openEditModal(tx: ITransaction): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;
    const rowMap = this.rowMap();
    const modal = await this.modalCtrl.create({
      component: TransactionFormComponent,
      componentProps: {
        transaction: tx,
        userId: user.sub,
        userBaseCurrency: 'EUR',
        rowNumber: rowMap[tx.txId],
      },
    });
    await modal.present();
  }

  async deleteTransaction(tx: ITransaction): Promise<void> {
    const rowMap = this.rowMap();
    const rowNumber = rowMap[tx.txId];
    if (!rowNumber) return;
    this.store.dispatch(TransactionsActions.deleteTransaction({ txId: tx.txId, rowNumber }));
    // El error toast lo maneja la suscripción a selectTransactionsError en ngOnInit
    const toast = await this.toastCtrl.create({
      message: 'Transacción eliminada',
      duration: 2000,
      color: 'medium',
    });
    await toast.present();
  }

  clearFilters(): void {
    this.filterWallet.set('');
    this.filterCategory.set('');
  }

  getCategoryName(categoryId: string): string {
    return this.categories().find(c => c.categoryId === categoryId)?.name ?? '—';
  }

  getWalletName(walletId: string): string {
    return this.wallets().find(w => w.walletId === walletId)?.name ?? '—';
  }
}
