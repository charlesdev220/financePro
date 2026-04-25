import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
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
  IonNote,
  AlertController,
  IonModal,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  addOutline,
  removeOutline,
  settingsOutline,
  rocketOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '@core/services/auth.service';
import { TransactionsActions } from '@store/transactions/transactions.actions';
import { selectAllTransactions } from '@store/transactions/transactions.selectors';
import { TransactionFormComponent } from '@features/transactions/transaction-form/transaction-form.component';
import { ITransaction } from '@models/transaction.model';
import { DashboardChartComponent } from './components/dashboard-chart/dashboard-chart.component';
import { PeriodSelectorComponent } from '@shared/components/period-selector/period-selector.component';
import { selectAllCategories } from '@store/categories/categories.selectors';
import { DashboardService } from './services/dashboard.service';
import { selectAllBudgets } from '@store/budgets/budgets.selectors';
import { BudgetsActions } from '@store/budgets/budgets.actions';
import { WalletsActions } from '@store/wallets/wallets.actions';
import { CategoriesActions } from '@store/categories/categories.actions';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';
import { RelativeDatePipe } from '@shared/pipes/relative-date.pipe';
import { selectAllWallets } from '@store/wallets/wallets.selectors';
import { DataSeedService } from '@core/services/data-seed.service';
import { TRANSACTION_TYPES, TransactionType } from '@core/constants/transaction.constants';
import { map } from 'rxjs';
import { selectBaseCurrency } from '@store/currency/currency.selectors';
import { CurrencyActions } from '@store/currency/currency.actions';

/**
 * DashboardPage — Vista principal consolidada de la salud financiera del usuario.
 * Utiliza una arquitectura reactiva basada en Signals para la gestión de estado local
 * y NgRx para el estado global del dominio.
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: [],
  standalone: true,
  imports: [
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
    IonNote,
    IonSpinner,
    IonModal,
    DashboardChartComponent,
    PeriodSelectorComponent,
    CurrencyFormatPipe,
    RelativeDatePipe,
    TransactionFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly seedService = inject(DataSeedService);

  /** Período de tiempo seleccionado para filtrar los datos (formato YYYY-MM). */
  readonly period = signal(new Date().toISOString().slice(0, 7));

  /** Estado de visibilidad del modal de nueva transacción. */
  readonly isModalOpen = signal(false);

  /** Tipo de transacción (ingreso/gasto) para el modal abierto. */
  readonly modalInitialType = signal<TransactionType>(TRANSACTION_TYPES.EXPENSE);

  /** ID del usuario actual para el modal (Signal reactivo para evitar fugas de contexto). */
  readonly currentUserId = signal<string>('');

  /** Todas las transacciones del usuario sincronizadas desde el Store. */
  private readonly allTransactions = toSignal(
    this.store.select(selectAllTransactions),
    { initialValue: [] as ITransaction[] }
  );

  /** Lista de categorías activas para el desglose visual. */
  private readonly categories = toSignal(
    this.store.select(selectAllCategories),
    { initialValue: [] }
  );

  /** Presupuestos vigentes para el indicador de gasto mensual. */
  private readonly budgets = toSignal(
    this.store.select(selectAllBudgets),
    { initialValue: [] }
  );

  /** Carteras configuradas por el usuario. */
  private readonly wallets = toSignal(
    this.store.select(selectAllWallets),
    { initialValue: [] }
  );

  /** Indica si la cuenta necesita inicialización (sin carteras ni categorías). */
  readonly needsSeed = computed(() => this.wallets().length === 0);

  /** Estado de carga del proceso de seed. */
  readonly isSeeding = signal(false);

  /** Moneda base del usuario desde USER_SETTINGS via NgRx. Fallback 'EUR' antes de cargar. */
  readonly userBaseCurrency = toSignal(
    this.store.select(selectBaseCurrency).pipe(map(c => c ?? 'EUR')),
    { initialValue: 'EUR' }
  );

  /** Resumen consolidado: Ingresos, Gastos y Balance del período actual. */
  readonly summary = computed(() =>
    this.dashboardService.calculateSummary(this.allTransactions(), this.period())
  );

  /** Datos del gráfico (desglose por categoría) calculados reactivamente. */
  readonly breakdown = computed(() =>
    this.dashboardService.calculateBreakdown(this.allTransactions(), this.categories(), this.period())
  );

  /** Útimos movimientos del período, enriquecidos con iconos, nombres y flag de tipo. */
  readonly recentTransactions = computed(() => {
    const txs = this.dashboardService.getRecentTransactions(this.allTransactions(), this.period());
    const cats = this.categories();
    return txs.map(tx => {
      const cat = cats.find(c => c.categoryId === tx.categoryId);
      return {
        ...tx,
        categoryName: cat?.name || 'Varios',
        categoryIcon: cat?.icon || '💰',
        isIncome: tx.type === TRANSACTION_TYPES.INCOME,
      };
    });
  });

  constructor() {
    addIcons({ logOutOutline, addOutline, removeOutline, settingsOutline, rocketOutline, sparklesOutline });
  }

  /**
   * Inicializa la carga de datos del dominio al entrar a la página.
   * Centraliza los disparos de NgRx para garantizar sincronización inicial.
   */
  ngOnInit(): void {
    this.store.dispatch(TransactionsActions.loadTransactions());
    this.store.dispatch(BudgetsActions.loadBudgets());
    this.store.dispatch(WalletsActions.loadWallets());
    this.store.dispatch(CategoriesActions.loadCategories());
  }

  /**
   * Actualiza el período de visualización global del dashboard.
   * @param p Período en formato ISO (YYYY-MM).
   */
  onPeriodChange(p: string): void {
    this.period.set(p);
  }

  openAddExpense(): void { this.openAddModal(TRANSACTION_TYPES.EXPENSE as 'expense'); }
  openAddIncome(): void { this.openAddModal(TRANSACTION_TYPES.INCOME as 'income'); }

  /**
   * Prepara y abre el modal declarativo para registrar una nueva transacción.
   * @param initialType Tipo de operación sugerida (ingreso o gasto).
   */
  openAddModal(initialType: 'income' | 'expense'): void {
    const user = this.authService.getUser();
    if (!user) return;

    this.currentUserId.set(user.sub || '');
    this.modalInitialType.set(initialType);
    this.isModalOpen.set(true);
  }

  /**
   * Cierra el modal de transacción y limpia el estado local asociado.
   */
  closeModal(): void {
    this.isModalOpen.set(false);
  }

  /**
   * Redirecciona a la vista de ajustes del perfil.
   */
  openSettings(): void {
    this.router.navigate(['/tabs/settings']);
  }

  /**
   * Gestiona el proceso de cierre de sesión mediante confirmación del usuario.
   */
  async logout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro de que querés salir?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Salir', handler: () => this.authService.signOut() }
      ]
    });
    await alert.present();
  }

  /**
   * Ejecuta la inicialización de datos por defecto para la cuenta del usuario.
   */
  async seedData(): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;

    this.isSeeding.set(true);
    this.seedService.seedUserBaseData(user.sub).subscribe({
      next: () => {
        // Recargar datos en el store tras el seed exitoso
        this.store.dispatch(WalletsActions.loadWallets());
        this.store.dispatch(CategoriesActions.loadCategories());
        this.isSeeding.set(false);
      },
      error: () => {
        this.isSeeding.set(false);
        this.alertCtrl.create({
          header: 'Error al inicializar',
          message: 'No se pudieron crear los datos iniciales. Revisá tu conexión e intentá de nuevo.',
          buttons: [{ text: 'Entendido', role: 'cancel' }],
        }).then(a => a.present());
      }
    });
  }
}
