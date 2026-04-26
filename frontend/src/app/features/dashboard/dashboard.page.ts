import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import {
  IonContent,
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
  addOutline,
  removeOutline,
  rocketOutline,
  sparklesOutline,
} from 'ionicons/icons';

import { AuthService } from '@core/services/auth.service';
import { TransactionsStateService } from '@core/state/transactions.state';
import { BudgetsStateService } from '@core/state/budgets.state';
import { WalletsStateService } from '@core/state/wallets.state';
import { CategoriesStateService } from '@core/state/categories.state';
import { CurrencyStateService } from '@core/state/currency.state';
import { TransactionFormComponent } from '@features/transactions/transaction-form/transaction-form.component';
import { DashboardChartComponent } from './components/dashboard-chart/dashboard-chart.component';
import { PeriodSelectorComponent } from '@shared/components/period-selector/period-selector.component';
import { DashboardService } from './services/dashboard.service';
import { DataSeedService } from '@core/services/data-seed.service';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';
import { RelativeDatePipe } from '@shared/pipes/relative-date.pipe';
import { TRANSACTION_TYPES, TransactionType } from '@core/constants/transaction.constants';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: [],
  standalone: true,
  imports: [
    IonContent,
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
  private readonly alertCtrl = inject(AlertController);
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly seedService = inject(DataSeedService);

  /** Transacciones del usuario sincronizadas desde el state service. */
  readonly txState = inject(TransactionsStateService);
  /** Categorías activas para el desglose visual. */
  readonly categoriesState = inject(CategoriesStateService);
  /** Presupuestos vigentes para el indicador de gasto mensual. */
  readonly budgetsState = inject(BudgetsStateService);
  /** Carteras configuradas por el usuario. */
  readonly walletsState = inject(WalletsStateService);
  /** Moneda base y divisas del usuario. */
  readonly currencyState = inject(CurrencyStateService);

  /** Período de tiempo seleccionado para filtrar los datos (formato YYYY-MM). */
  readonly period = signal(new Date().toISOString().slice(0, 7));
  /** Estado de visibilidad del modal de nueva transacción. */
  readonly isModalOpen = signal(false);
  /** Tipo de transacción (ingreso/gasto) para el modal abierto. */
  readonly modalInitialType = signal<TransactionType>(TRANSACTION_TYPES.EXPENSE);
  /** ID del usuario actual para el modal. */
  readonly currentUserId = signal<string>('');
  /** Estado de carga del proceso de seed. */
  readonly isSeeding = signal(false);
  /** Tick que se incrementa en ionViewDidEnter para forzar chart.resize() al volver al tab. */
  readonly chartRefreshTick = signal(0);

  /** Indica si la cuenta necesita inicialización (sin carteras). */
  readonly needsSeed = computed(() => this.walletsState.items().length === 0);

  /** Moneda base del usuario. Fallback 'EUR' antes de cargar. */
  readonly userBaseCurrency = computed(() => this.currencyState.baseCurrency() ?? 'EUR');

  /** Resumen consolidado: Ingresos, Gastos y Balance del período actual. */
  readonly summary = computed(() =>
    this.dashboardService.calculateSummary(this.txState.items(), this.period())
  );

  /** Datos del gráfico (desglose por categoría) calculados reactivamente. */
  readonly breakdown = computed(() =>
    this.dashboardService.calculateBreakdown(this.txState.items(), this.categoriesState.items(), this.period())
  );

  /** Últimos movimientos del período, enriquecidos con metadatos de categoría, ordenados DESC por fecha. */
  readonly recentTransactions = computed(() => {
    const txs = this.dashboardService.getRecentTransactions(this.txState.items(), this.period());
    const cats = this.categoriesState.items();
    return [...txs]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(tx => {
        const cat = cats.find(c => c.categoryId === tx.categoryId);
        const isIncome = tx.type === TRANSACTION_TYPES.INCOME;
        // Gasto negativo (devolución/reembolso): amount < 0 en un expense → se visualiza como ingreso
        const isEffectiveIncome = isIncome || (tx.type === TRANSACTION_TYPES.EXPENSE && tx.amount < 0);
        return {
          ...tx,
          categoryName: cat?.name || 'Varios',
          categoryIcon: cat?.icon || '💰',
          isIncome,
          isEffectiveIncome,
          displayAmount: Math.abs(tx.amount),
        };
      });
  });

  constructor() {
    addIcons({ addOutline, removeOutline, rocketOutline, sparklesOutline });
  }

  ngOnInit(): void {
    this.txState.load();
    this.budgetsState.load();
    this.walletsState.load();
    this.categoriesState.load();
    this.currencyState.load();
  }

  ionViewDidEnter(): void {
    this.chartRefreshTick.update(v => v + 1);
  }

  onPeriodChange(p: string): void {
    this.period.set(p);
  }

  openAddExpense(): void { this.openAddModal(TRANSACTION_TYPES.EXPENSE); }
  openAddIncome(): void { this.openAddModal(TRANSACTION_TYPES.INCOME); }

  openAddModal(initialType: 'income' | 'expense'): void {
    const user = this.authService.getUser();
    if (!user) return;
    this.currentUserId.set(user.sub || '');
    this.modalInitialType.set(initialType);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  async seedData(): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;
    this.isSeeding.set(true);
    this.seedService.seedUserBaseData(user.sub).subscribe({
      next: () => {
        this.walletsState.load();
        this.categoriesState.load();
        this.isSeeding.set(false);
      },
      error: () => {
        this.isSeeding.set(false);
        this.alertCtrl.create({
          header: 'Error al inicializar',
          message: 'No se pudieron crear los datos iniciales. Revisá tu conexión e intentá de nuevo.',
          buttons: [{ text: 'Entendido', role: 'cancel' }],
        }).then(a => a.present());
      },
    });
  }
}
