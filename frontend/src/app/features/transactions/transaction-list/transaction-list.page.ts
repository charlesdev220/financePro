import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { addOutline, trashOutline, createOutline, arrowUpOutline, arrowDownOutline, chevronUpOutline, chevronDownOutline } from 'ionicons/icons';
import { TransactionsActions } from '../../../store/transactions/transactions.actions';
import {
  selectAllTransactions,
  selectTransactionsRowMap,
  selectTransactionsError,
} from '../../../store/transactions/transactions.selectors';
import { WalletsActions } from '../../../store/wallets/wallets.actions';
import { selectAllWallets } from '../../../store/wallets/wallets.selectors';
import { CategoriesActions } from '../../../store/categories/categories.actions';
import { selectActiveCategories } from '../../../store/categories/categories.selectors';
import { AuthService } from '../../../core/services/auth.service';
import { ITransaction } from '../../../models/transaction.model';
import { RelativeDatePipe } from '../../../shared/pipes/relative-date.pipe';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';

@Component({
  selector: 'app-transaction-list',
  templateUrl: 'transaction-list.page.html',
  styleUrls: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonNote,
    IonFab, IonFabButton,
    IonItemSliding, IonItemOption, IonItemOptions,
    RelativeDatePipe, CurrencyFormatPipe,
  ],
})
export class TransactionListPage implements OnInit {
  private readonly store      = inject(Store);
  private readonly modalCtrl  = inject(ModalController);
  private readonly toastCtrl  = inject(ToastController);
  private readonly authService = inject(AuthService);

  readonly filterWallet   = signal<string>('');
  readonly filterCategory = signal<string>('');
  readonly filterPeriod   = signal<string>('');

  readonly filterWalletOpen   = signal(false);
  readonly filterCategoryOpen = signal(false);
  readonly filterPeriodOpen   = signal(false);

  /** Label del filtro de cartera activo para mostrar en el botón del acordeón. */
  readonly filterWalletLabel = computed(() =>
    this.filterWallet()
      ? (this.wallets().find(w => w.walletId === this.filterWallet())?.name ?? 'Cartera')
      : 'Todas las carteras'
  );
  /** Label del filtro de categoría activo para mostrar en el botón del acordeón. */
  readonly filterCategoryLabel = computed(() =>
    this.filterCategory()
      ? (this.categories().find(c => c.categoryId === this.filterCategory())?.name ?? 'Categoría')
      : 'Todas las categorías'
  );
  /** Label del filtro de período activo para mostrar en el botón del acordeón. */
  readonly filterPeriodLabel = computed(() =>
    this.filterPeriod() || 'Todos los períodos'
  );

  /** Último error de operación de transacciones (addTransaction/updateTransaction/deleteTransaction). */
  readonly error = toSignal(this.store.select(selectTransactionsError), { initialValue: null });

  /** Todas las transacciones del store, sin filtrar por usuario. Base para computed filteredTxs. */
  private readonly allTransactions = toSignal(
    this.store.select(selectAllTransactions), { initialValue: [] },
  );
  /** Carteras del usuario para poblar el selector de filtro por cartera. */
  readonly wallets = toSignal(this.store.select(selectAllWallets), { initialValue: [] });
  /** Categorías activas para poblar el selector de filtro por categoría. */
  readonly categories = toSignal(this.store.select(selectActiveCategories), { initialValue: [] });
  /** Mapa txId → rowNumber en Sheets, necesario para operaciones de edición y borrado. */
  private readonly rowMap = toSignal(this.store.select(selectTransactionsRowMap), { initialValue: {} as Record<string, number> });

  /** Transacciones del usuario filtradas por cartera, categoría y período, ordenadas por fecha desc. */
  readonly transactions = computed(() => {
    const userId = this.authService.getUser()?.sub ?? '';
    let txs = this.allTransactions().filter(t => t.userId === userId);
    if (this.filterWallet())   txs = txs.filter(t => t.walletId === this.filterWallet());
    if (this.filterCategory()) txs = txs.filter(t => t.categoryId === this.filterCategory());
    if (this.filterPeriod())   txs = txs.filter(t => t.date.startsWith(this.filterPeriod()));
    return txs.slice().sort((a, b) => b.date.localeCompare(a.date));
  });

  /** Últimos 12 períodos YYYY-MM para el selector de filtro de período. */
  readonly availablePeriods = computed(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  });

  /** True cuando hay al menos una transacción visible con los filtros activos. */
  readonly hasTransactions = computed(() => this.transactions().length > 0);
  /** True cuando hay al menos un filtro activo (cartera, categoría o período). */
  readonly activeFilters   = computed(() => !!(this.filterWallet() || this.filterCategory() || this.filterPeriod()));

  private _prevError = signal<string | null>(null);

  constructor() {
    addIcons({ addOutline, trashOutline, createOutline, arrowUpOutline, arrowDownOutline, chevronUpOutline, chevronDownOutline });
    // Muestra toast solo cuando aparece un error nuevo, ignorando el valor inicial null.
    effect(() => {
      const err = this.error();
      if (err && err !== this._prevError()) {
        this._prevError.set(err);
        this.showErrorToast(err);
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(TransactionsActions.loadTransactions());
    this.store.dispatch(WalletsActions.loadWallets());
    this.store.dispatch(CategoriesActions.loadCategories());
  }

  async openAddModal(): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;
    const modal = await this.modalCtrl.create({
      component: TransactionFormComponent,
      componentProps: { userId: user.sub, userBaseCurrency: 'EUR' },
      backdropDismiss: true,
    });
    await modal.present();
  }

  async openEditModal(tx: ITransaction): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;
    const modal = await this.modalCtrl.create({
      component: TransactionFormComponent,
      componentProps: {
        transaction: tx,
        userId: user.sub,
        userBaseCurrency: 'EUR',
        rowNumber: this.rowMap()[tx.txId],
      },
      backdropDismiss: true,
    });
    await modal.present();
  }

  async deleteTransaction(tx: ITransaction): Promise<void> {
    const rowNumber = this.rowMap()[tx.txId];
    if (!rowNumber) return;
    this.store.dispatch(TransactionsActions.deleteTransaction({ txId: tx.txId, rowNumber }));
    const toast = await this.toastCtrl.create({
      message: 'Transacción eliminada',
      duration: 2000,
      color: 'medium',
    });
    await toast.present();
  }

  onFilterWalletChange(event: Event): void {
    this.filterWallet.set((event as CustomEvent).detail.value);
  }

  onFilterCategoryChange(event: Event): void {
    this.filterCategory.set((event as CustomEvent).detail.value);
  }

  onFilterPeriodChange(event: Event): void {
    this.filterPeriod.set((event as CustomEvent).detail.value);
  }

  toggleWalletFilter(): void {
    this.filterWalletOpen.update(v => !v);
    this.filterCategoryOpen.set(false);
    this.filterPeriodOpen.set(false);
  }

  toggleCategoryFilter(): void {
    this.filterCategoryOpen.update(v => !v);
    this.filterWalletOpen.set(false);
    this.filterPeriodOpen.set(false);
  }

  togglePeriodFilter(): void {
    this.filterPeriodOpen.update(v => !v);
    this.filterWalletOpen.set(false);
    this.filterCategoryOpen.set(false);
  }

  setWalletFilter(value: string): void {
    this.filterWallet.set(value);
    this.filterWalletOpen.set(false);
  }

  setCategoryFilter(value: string): void {
    this.filterCategory.set(value);
    this.filterCategoryOpen.set(false);
  }

  setPeriodFilter(value: string): void {
    this.filterPeriod.set(value);
    this.filterPeriodOpen.set(false);
  }

  clearFilters(): void {
    this.filterWallet.set('');
    this.filterCategory.set('');
    this.filterPeriod.set('');
    this.filterWalletOpen.set(false);
    this.filterCategoryOpen.set(false);
    this.filterPeriodOpen.set(false);
  }

  getCategoryName(categoryId: string): string {
    return this.categories().find(c => c.categoryId === categoryId)?.name ?? '—';
  }

  getWalletName(walletId: string): string {
    return this.wallets().find(w => w.walletId === walletId)?.name ?? '—';
  }

  private async showErrorToast(msg: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: `Error: ${msg}`,
      duration: 3000,
      color: 'danger',
    });
    await toast.present();
  }
}
