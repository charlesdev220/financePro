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
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  removeOutline,
  rocketOutline,
  sparklesOutline,
  folderOpenOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from 'ionicons/icons';

import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { TransactionsStateService } from '@core/state/transactions.state';
import { BudgetsStateService } from '@core/state/budgets.state';
import { WalletsStateService } from '@core/state/wallets.state';
import { CategoriesStateService } from '@core/state/categories.state';
import { CurrencyStateService } from '@core/state/currency.state';
import { UserSettingsStateService } from '@core/state/user-settings.state';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { PeriodService } from '@core/services/period.service';
import { PeriodTab } from '@core/constants/period.constants';
import { TransactionFormComponent } from '@features/transactions/transaction-form/transaction-form.component';
import { WorkspaceFormComponent } from '@features/workspaces/workspace-form/workspace-form.component';
import { DashboardChartComponent } from './components/dashboard-chart/dashboard-chart.component';
import { PeriodSelectorComponent } from '@shared/components/period-selector/period-selector.component';
import { WorkspaceSelectorComponent } from '@shared/components/workspace-selector/workspace-selector.component';
import { DashboardService, DateRange } from './services/dashboard.service';
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
    WorkspaceSelectorComponent,
    CurrencyFormatPipe,
    RelativeDatePipe,
    TransactionFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  private readonly alertCtrl         = inject(AlertController);
  private readonly modalCtrl         = inject(ModalController);
  private readonly toastCtrl         = inject(ToastController);
  private readonly authService       = inject(AuthService);
  private readonly dashboardService  = inject(DashboardService);
  private readonly seedService       = inject(DataSeedService);
  private readonly router            = inject(Router);
  private readonly periodService     = inject(PeriodService);

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
  /** Configuración del usuario: presupuesto por defecto y día de inicio de mes. */
  readonly userSettingsState = inject(UserSettingsStateService);
  /** Workspaces del usuario para el selector de espacios en el header. */
  readonly workspacesState = inject(WorkspacesStateService);

  /** Tab de período activo en el selector (día / semana / mes / año). */
  readonly activePeriodTab = signal<PeriodTab>('month');
  /** Offset de navegación temporal: 0 = período actual, -1 = anterior, -2 = hace 2, etc. */
  readonly navigationOffset = signal<number>(0);

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

  /** Verdadero solo si el usuario no tiene ninguna cartera en ningún workspace (cuenta nueva). */
  readonly needsSeed = computed(() => this.walletsState.allItems().length === 0);

  /** Verdadero cuando el workspace activo está vacío pero el usuario ya tiene datos en otros. */
  readonly isEmptyWorkspace = computed(
    () => !this.needsSeed() && this.walletsState.items().length === 0,
  );

  /** Presupuesto mensual por defecto desde UserSettings — pasado al chart para categorías sin registro. */
  readonly defaultCategoryBudget = this.userSettingsState.defaultCategoryBudget;

  /** Moneda base del usuario. Fallback 'EUR' antes de cargar. */
  readonly userBaseCurrency = computed(() => this.currencyState.baseCurrency() ?? 'EUR');

  /** Rango de fechas { from, to } calculado según tab activo, monthStartDay y offset de navegación. */
  readonly dateRange = computed((): DateRange =>
    this.periodService.getDateRange(
      this.activePeriodTab(),
      new Date(),
      this.userSettingsState.monthStartDay(),
      this.navigationOffset(),
    )
  );

  /** Etiqueta legible del período activo para el header del dashboard. */
  readonly periodLabel = computed(() =>
    this.periodService.getPeriodLabel(
      this.activePeriodTab(),
      new Date(),
      this.userSettingsState.monthStartDay(),
      this.navigationOffset(),
    )
  );

  /** Deshabilita el chevron > cuando ya estamos en el período actual (offset = 0). */
  readonly canNavigateForward = computed(() => this.navigationOffset() < 0);

  /** Resumen consolidado: Ingresos, Gastos y Balance del período actual. */
  readonly summary = computed(() =>
    this.dashboardService.calculateSummary(this.txState.items(), this.dateRange())
  );

  /** Datos del gráfico (desglose por categoría) calculados reactivamente. */
  readonly breakdown = computed(() =>
    this.dashboardService.calculateBreakdown(this.txState.items(), this.categoriesState.items(), this.dateRange())
  );

  /**
   * Presupuestos del período activo con spentAmount recalculado desde las transacciones del store.
   * Soporta los tres modos de vigencia: indefinite (siempre visible), period (por rango de fechas) y disabled.
   */
  readonly budgetsForPeriod = computed(() => {
    const range = this.dateRange();
    const txs   = this.txState.items();
    const today = new Date().toISOString().slice(0, 10);
    return this.budgetsState.items()
      .filter(b => {
        if (b.mode === 'disabled') return false;
        if (b.mode === 'period') {
          return !!b.startDate && !!b.endDate && today >= b.startDate && today <= b.endDate;
        }
        // indefinite: siempre visible
        return true;
      })
      .map(b => {
        const safe = (n: number) => (isNaN(n) || !isFinite(n) ? 0 : n);
        const spentAmount = txs
          .filter(t =>
            t.type === TRANSACTION_TYPES.EXPENSE &&
            t.categoryId === b.categoryId &&
            t.date >= range.from &&
            t.date <= range.to,
          )
          .reduce((sum, t) => sum + safe(t.amountBase), 0);
        return { ...b, spentAmount };
      });
  });

  /** Últimos movimientos del período, enriquecidos con metadatos de categoría, ordenados DESC por fecha. */
  readonly recentTransactions = computed(() => {
    const txs = this.dashboardService.getRecentTransactions(this.txState.items(), this.dateRange());
    const cats = this.categoriesState.items();
    return [...txs]
      .sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date))
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
    addIcons({ addOutline, removeOutline, rocketOutline, sparklesOutline, folderOpenOutline, chevronBackOutline, chevronForwardOutline });
  }

  ngOnInit(): void {
    this.workspacesState.load();
    this.txState.load();
    this.budgetsState.load();
    this.walletsState.load();
    this.categoriesState.load();
    this.userSettingsState.load();
    this.currencyState.load();
  }

  ionViewDidEnter(): void {
    this.chartRefreshTick.update(v => v + 1);
  }

  onTabChange(tab: PeriodTab): void {
    this.activePeriodTab.set(tab);
    this.navigationOffset.set(0);
  }

  onNavigatePrev(): void {
    this.navigationOffset.update(v => v - 1);
  }

  onNavigateNext(): void {
    if (this.canNavigateForward()) {
      this.navigationOffset.update(v => v + 1);
    }
  }

  goToTransactions(): void {
    this.router.navigate(['/tabs/dashboard/transactions']);
  }

  goToWallets(): void {
    this.router.navigate(['/tabs/wallets']);
  }

  async onWorkspaceSwitched(id: string): Promise<void> {
    this.workspacesState.setActive(id);
    const ws = this.workspacesState.items().find(w => w.workspaceId === id);
    if (!ws) return;
    const toast = await this.toastCtrl.create({
      message: `${ws.icon}  ${ws.name}`,
      duration: 1800,
      position: 'top',
      color: 'dark',
    });
    await toast.present();
  }

  async onNewWorkspace(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: WorkspaceFormComponent,
      breakpoints: [0, 0.75],
      initialBreakpoint: 0.75,
    });
    await modal.present();
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
