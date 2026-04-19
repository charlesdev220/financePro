import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { ToastController } from '@ionic/angular/standalone';
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
  IonNote,
  IonItemSliding,
  IonItemOption,
  IonItemOptions,
  IonModal,
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

/**
 * TransactionListPage — Vista de listado detallado de movimientos.
 * Permite filtrar por cartera, categoría y período, además de gestionar
 * la edición y borrado de transacciones mediante una interfaz reactiva.
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
    IonList, IonItem, IonLabel, IonNote,
    IonFab, IonFabButton,
    IonItemSliding, IonItemOption, IonItemOptions,
    IonModal,
    TransactionFormComponent,
    RelativeDatePipe, CurrencyFormatPipe,
  ],
})
export class TransactionListPage implements OnInit {
  private readonly store      = inject(Store);
  private readonly toastCtrl  = inject(ToastController);
  private readonly authService = inject(AuthService);

  /** Filtro activo por cartera. */
  readonly filterWallet   = signal<string>('');
  /** Filtro activo por categoría. */
  readonly filterCategory = signal<string>('');
  /** Filtro activo por período (YYYY-MM). */
  readonly filterPeriod   = signal<string>('');

  /** Estado de visibilidad del selector de carteras. */
  readonly filterWalletOpen   = signal(false);
  /** Estado de visibilidad del selector de categorías. */
  readonly filterCategoryOpen = signal(false);
  /** Estado de visibilidad del selector de períodos. */
  readonly filterPeriodOpen   = signal(false);

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

  /** Etiqueta descriptiva del período filtrado. */
  readonly filterPeriodLabel = computed(() =>
    this.filterPeriod() || 'Todos los períodos'
  );

  /** Último mensaje de error emitido por el dominio de transacciones. */
  readonly error = toSignal(this.store.select(selectTransactionsError), { initialValue: null });

  /** Colección completa de transacciones del usuario sincronizadas con el Store. */
  private readonly allTransactions = toSignal(
    this.store.select(selectAllTransactions), { initialValue: [] as ITransaction[] },
  );

  /** Carteras disponibles para alimentar los filtros. */
  readonly wallets = toSignal(this.store.select(selectAllWallets), { initialValue: [] });

  /** Categorías activas disponibles para alimentar los filtros. */
  readonly categories = toSignal(this.store.select(selectActiveCategories), { initialValue: [] });

  /** Mapa de txId a número de fila para permitir ediciones en Sheets. */
  readonly rowMap = toSignal(this.store.select(selectTransactionsRowMap), { initialValue: {} as Record<string, number> });

  /** Lista de transacciones filtradas y enriquecidas con iconos y nombres de categoría. */
  readonly transactionsEnriched = computed(() => {
    const userId = this.authService.getUser()?.sub ?? '';
    const cats = this.categories();
    return this.allTransactions()
      .filter(t => t.userId === userId)
      .filter(t => !this.filterWallet() || t.walletId === this.filterWallet())
      .filter(t => !this.filterCategory() || t.categoryId === this.filterCategory())
      .filter(t => !this.filterPeriod() || t.date.startsWith(this.filterPeriod()))
      .map(t => {
        const cat = cats.find(c => c.categoryId === t.categoryId);
        return {
          ...t,
          categoryName: cat?.name || 'Varios',
          categoryIcon: cat?.icon || '💰'
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  /** Transacciones agrupadas por fecha para la vista de lista cronológica. */
  readonly groupedTransactions = computed(() => {
    const txs = this.transactionsEnriched();
    const groups: { date: string; transactions: any[]; totalDaily: number }[] = [];
    
    txs.forEach(tx => {
      let group = groups.find(g => g.date === tx.date);
      if (!group) {
        group = { date: tx.date, transactions: [], totalDaily: 0 };
        groups.push(group);
      }
      group.transactions.push(tx);
      group.totalDaily += (tx.type === 'income' ? tx.amountBase : -tx.amountBase);
    });
    
    return groups;
  });

  /** Divisa base detectada para los totales diarios. */
  readonly userBaseCurrency = computed(() => {
    const txs = this.allTransactions();
    return txs.length > 0 ? txs[0].currency : 'EUR';
  });

  /** Últimos 12 períodos YYYY-MM para el selector de filtro de período. */
  readonly availablePeriods = computed(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  });

  /** Estado de visibilidad del modal de formulario. */
  readonly isModalOpen = signal(false);
  /** Transacción seleccionada para edición (null si se está creando una nueva). */
  readonly selectedTransaction = signal<ITransaction | null>(null);
  /** ID del usuario actual para vincular la transacción. */
  readonly currentUserId = signal<string>('');

  /** Determina si hay transacciones que mostrar con los filtros actuales. */
  readonly hasTransactions = computed(() => this.transactionsEnriched().length > 0);
  /** Indica si hay algún filtro de búsqueda activo. */
  readonly activeFilters   = computed(() => !!(this.filterWallet() || this.filterCategory() || this.filterPeriod()));

  private _prevError = signal<string | null>(null);

  constructor() {
    addIcons({ addOutline, trashOutline, createOutline, arrowUpOutline, arrowDownOutline, chevronUpOutline, chevronDownOutline });
    
    // Efecto reactivo para mostrar alertas de error de forma automatizada.
    effect(() => {
      const err = this.error();
      if (err && err !== this._prevError()) {
        this._prevError.set(err);
        this.showErrorToast(err);
      }
    });
  }

  /**
   * Carga inicial de datos de dominio.
   */
  ngOnInit(): void {
    this.store.dispatch(TransactionsActions.loadTransactions());
    this.store.dispatch(WalletsActions.loadWallets());
    this.store.dispatch(CategoriesActions.loadCategories());
  }

  /**
   * Prepara y abre el modal declarativo para una nueva transacción.
   */
  openAddModal(): void {
    const user = this.authService.getUser();
    if (!user) return;
    this.currentUserId.set(user.sub || '');
    this.selectedTransaction.set(null);
    this.isModalOpen.set(true);
  }

  /**
   * Prepara y abre el modal declarativo para editar una transacción existente.
   * @param tx Transacción a editar.
   */
  openEditModal(tx: ITransaction): void {
    const user = this.authService.getUser();
    if (!user) return;
    this.currentUserId.set(user.sub || '');
    this.selectedTransaction.set(tx);
    this.isModalOpen.set(true);
  }

  /**
   * Cierra el modal y limpia la selección.
   */
  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedTransaction.set(null);
  }

  /**
   * Elimina una transacción del sistema sincronizando el Store.
   * @param tx Transacción a eliminar.
   */
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

  // --- Handlers de Filtros ---

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
