import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonItemSliding,
  IonItemOption,
  IonItemOptions,
  IonModal,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, createOutline, arrowUpOutline, arrowDownOutline, chevronUpOutline, chevronDownOutline, walletOutline, sparklesOutline, calendarOutline, closeCircleOutline } from 'ionicons/icons';
import { TransactionsStateService } from '@core/state/transactions.state';
import { WalletsStateService } from '@core/state/wallets.state';
import { CategoriesStateService } from '@core/state/categories.state';
import { CurrencyStateService } from '@core/state/currency.state';
import { AuthService } from '@core/services/auth.service';
import { ITransaction } from '@models/transaction.model';
import { RelativeDatePipe } from '@shared/pipes/relative-date.pipe';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';
import { TransactionFormComponent } from '@features/transactions/transaction-form/transaction-form.component';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

/**
 * TransactionListPage — Vista de listado detallado de movimientos.
 * Permite filtrar por cartera, categoría y rango de fechas mediante paneles inline reactivos.
 */
@Component({
  selector: 'app-transaction-list',
  templateUrl: 'transaction-list.page.html',
  styleUrls: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonButton, IonIcon,
    IonItem, IonLabel,
    IonItemSliding, IonItemOption, IonItemOptions,
    IonModal,
    TransactionFormComponent,
    RelativeDatePipe, CurrencyFormatPipe,
  ],
})
export class TransactionListPage implements OnInit {
  private readonly txState          = inject(TransactionsStateService);
  private readonly walletsState     = inject(WalletsStateService);
  private readonly categoriesState  = inject(CategoriesStateService);
  private readonly currencyState    = inject(CurrencyStateService);
  private readonly toastCtrl        = inject(ToastController);
  private readonly authService      = inject(AuthService);

  /** Filtro activo por cartera. */
  readonly filterWallet   = signal<string>('');
  /** Filtro activo por categoría. */
  readonly filterCategory = signal<string>('');
  /** Fecha de inicio del rango de filtro (YYYY-MM-DD). Vacío = sin límite inferior. */
  readonly filterDateFrom = signal<string>('');
  /** Fecha de fin del rango de filtro (YYYY-MM-DD). Vacío = sin límite superior. */
  readonly filterDateTo   = signal<string>('');

  /** Panel de filtro activo. Solo uno puede estar abierto a la vez. */
  readonly openFilter = signal<'wallet' | 'category' | 'period' | null>(null);

  /** Último mensaje de error emitido por el dominio de transacciones. */
  readonly error = this.txState.error;

  /** Colección completa de transacciones del usuario desde el state service. */
  private readonly allTransactions = this.txState.items;

  /** Carteras disponibles para alimentar los filtros. */
  readonly wallets = this.walletsState.items;

  /** Categorías activas disponibles para alimentar los filtros. */
  readonly categories = this.categoriesState.items;

  /** Mapa de txId a número de fila para permitir ediciones en Sheets. */
  readonly rowMap = this.txState.rowMap;

  /** Moneda base del usuario. Fallback 'EUR' antes de cargar. */
  readonly userBaseCurrency = computed(() => this.currencyState.baseCurrency() ?? 'EUR');

  /** Etiqueta descriptiva de la cartera filtrada. */
  readonly filterWalletLabel = computed(() =>
    this.filterWallet()
      ? (this.wallets().find(w => w.walletId === this.filterWallet())?.name ?? 'Cartera')
      : 'Todas las carteras'
  );

  /** Etiqueta descriptiva de la categoría filtrada. */
  readonly filterCategoryLabel = computed(() =>
    this.filterCategory()
      ? (this.categories().find(c => c.categoryId === this.filterCategory())?.name ?? 'Categoría')
      : 'Todas las categorías'
  );

  /** Etiqueta descriptiva del rango de fechas filtrado. */
  readonly filterPeriodLabel = computed(() => {
    const from = this.filterDateFrom();
    const to   = this.filterDateTo();
    if (from && to)  return `${from} → ${to}`;
    if (from)        return `Desde ${from}`;
    if (to)          return `Hasta ${to}`;
    return 'Período';
  });

  /** True cuando filterDateFrom > filterDateTo (rango inválido). */
  readonly dateRangeInvalid = computed(() => {
    const from = this.filterDateFrom();
    const to   = this.filterDateTo();
    return !!(from && to && from > to);
  });

  /** Lista de transacciones filtradas por cartera, categoría y rango de fechas, enriquecidas con metadatos de categoría. */
  readonly transactionsEnriched = computed(() => {
    const userId = this.authService.getUser()?.sub ?? '';
    const cats = this.categories();
    const from = this.filterDateFrom();
    const to   = this.filterDateTo();
    return this.allTransactions()
      .filter(t => t.userId === userId)
      .filter(t => !this.filterWallet() || t.walletId === this.filterWallet())
      .filter(t => !this.filterCategory() || t.categoryId === this.filterCategory())
      .filter(t => !from || t.date >= from)
      .filter(t => !to   || t.date <= to)
      .map(t => {
        const cat = cats.find(c => c.categoryId === t.categoryId);
        const isIncome = t.type === TRANSACTION_TYPES.INCOME;
        const isEffectiveIncome = isIncome || (t.type === TRANSACTION_TYPES.EXPENSE && t.amount < 0);
        return {
          ...t,
          categoryName: cat?.name || 'Varios',
          categoryIcon: cat?.icon || '💰',
          isEffectiveIncome,
          displayAmount: Math.abs(t.amount),
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  /** Transacciones agrupadas por fecha para la vista de lista cronológica. */
  readonly groupedTransactions = computed(() => {
    const txs = this.transactionsEnriched();
    const groups: { date: string; transactions: (ITransaction & { categoryName: string; categoryIcon: string; isEffectiveIncome: boolean; displayAmount: number })[]; totalDaily: number }[] = [];

    txs.forEach(tx => {
      let group = groups.find(g => g.date === tx.date);
      if (!group) {
        group = { date: tx.date, transactions: [], totalDaily: 0 };
        groups.push(group);
      }
      group.transactions.push(tx);
      group.totalDaily += (tx.type === TRANSACTION_TYPES.INCOME ? tx.amountBase : -tx.amountBase);
    });

    return groups;
  });

  /** Estado de visibilidad del modal de formulario. */
  readonly isModalOpen = signal(false);
  /** Transacción seleccionada para edición (null si se está creando una nueva). */
  readonly selectedTransaction = signal<ITransaction | null>(null);
  /** ID del usuario actual para vincular la transacción. */
  readonly currentUserId = signal<string>('');

  /** Determina si hay transacciones que mostrar con los filtros actuales. */
  readonly hasTransactions = computed(() => this.transactionsEnriched().length > 0);
  /** Indica si hay algún filtro activo. */
  readonly activeFilters = computed(() =>
    !!(this.filterWallet() || this.filterCategory() || this.filterDateFrom() || this.filterDateTo())
  );

  private _prevError = signal<string | null>(null);

  constructor() {
    addIcons({ addOutline, trashOutline, createOutline, arrowUpOutline, arrowDownOutline, chevronUpOutline, chevronDownOutline, walletOutline, sparklesOutline, calendarOutline, closeCircleOutline });

    effect(() => {
      const err = this.error();
      if (err && err !== this._prevError()) {
        this._prevError.set(err);
        this.showErrorToast(err);
      }
    });
  }

  ngOnInit(): void {
    this.txState.load();
    this.walletsState.load();
    this.categoriesState.load();
  }

  openAddModal(): void {
    const user = this.authService.getUser();
    if (!user) return;
    this.currentUserId.set(user.sub || '');
    this.selectedTransaction.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(tx: ITransaction): void {
    const user = this.authService.getUser();
    if (!user) return;
    this.currentUserId.set(user.sub || '');
    this.selectedTransaction.set(tx);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedTransaction.set(null);
  }

  async deleteTransaction(tx: ITransaction): Promise<void> {
    const rowNumber = this.rowMap()[tx.txId];
    if (!rowNumber) return;
    this.txState.delete(tx.txId, rowNumber);
    const toast = await this.toastCtrl.create({
      message: 'Transacción eliminada',
      duration: 2000,
      color: 'medium',
    });
    await toast.present();
  }

  // --- Handlers de Filtros ---

  /** Abre el panel del filtro indicado. Si ya está abierto, lo cierra (toggle mutex). */
  toggleFilter(key: 'wallet' | 'category' | 'period'): void {
    this.openFilter.update(v => v === key ? null : key);
  }

  setWalletFilter(value: string): void {
    this.filterWallet.set(value);
    this.openFilter.set(null);
  }

  setCategoryFilter(value: string): void {
    this.filterCategory.set(value);
    this.openFilter.set(null);
  }

  setDateFrom(event: Event): void {
    this.filterDateFrom.set((event.target as HTMLInputElement).value);
  }

  setDateTo(event: Event): void {
    this.filterDateTo.set((event.target as HTMLInputElement).value);
  }

  clearWalletFilter(): void {
    this.filterWallet.set('');
  }

  clearCategoryFilter(): void {
    this.filterCategory.set('');
  }

  clearPeriodFilter(): void {
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
  }

  clearFilters(): void {
    this.filterWallet.set('');
    this.filterCategory.set('');
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
    this.openFilter.set(null);
  }

  onCategoryFilterSelect(id: string): void {
    this.filterCategory.set(id);
    this.openFilter.set(null);
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
