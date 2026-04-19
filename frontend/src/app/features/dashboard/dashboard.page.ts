import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
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
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, addOutline, trendingUpOutline, trendingDownOutline, settingsOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { BUDGET_STATUS } from '../../core/constants/budget.constants';
import { TransactionsActions } from '../../store/transactions/transactions.actions';
import { BudgetsActions } from '../../store/budgets/budgets.actions';
import { WalletsActions } from '../../store/wallets/wallets.actions';
import { CategoriesActions } from '../../store/categories/categories.actions';
import { selectAllTransactions } from '../../store/transactions/transactions.selectors';
import { selectActiveCategories } from '../../store/categories/categories.selectors';
import { selectAllBudgets } from '../../store/budgets/budgets.selectors';
import { DashboardService } from './services/dashboard.service';
import { DashboardSummaryComponent } from './components/dashboard-summary/dashboard-summary.component';
import { DashboardChartComponent } from './components/dashboard-chart/dashboard-chart.component';
import { PeriodSelectorComponent } from '../../shared/components/period-selector/period-selector.component';
import { TransactionFormComponent } from '../transactions/transaction-form/transaction-form.component';
import { BudgetIndicatorComponent } from '../../shared/components/budget-indicator/budget-indicator.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { RelativeDatePipe } from '../../shared/pipes/relative-date.pipe';
import { ITransaction } from '../../models/transaction.model';
import { ICategory } from '../../models/category.model';
import { IBudget } from '../../models/budget.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
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
    DashboardSummaryComponent,
    DashboardChartComponent,
    PeriodSelectorComponent,
    BudgetIndicatorComponent,
    CurrencyFormatPipe,
    RelativeDatePipe,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DashboardPage implements OnInit {
  private readonly store = inject(Store);
  private readonly modalCtrl = inject(ModalController);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  readonly period = signal(new Date().toISOString().slice(0, 7));

  /** Todas las transacciones del usuario para calcular resumen y movimientos recientes. */
  private readonly allTransactions = toSignal(this.store.select(selectAllTransactions), { initialValue: [] as ITransaction[] });
  /** Categorías activas para calcular el breakdown de gastos por categoría. */
  private readonly allCategories = toSignal(this.store.select(selectActiveCategories), { initialValue: [] as ICategory[] });
  /** Presupuestos del usuario para mostrar alertas de presupuestos excedidos. */
  private readonly allBudgets = toSignal(this.store.select(selectAllBudgets), { initialValue: [] as IBudget[] });

  /** Resumen financiero (ingresos, gastos, balance) del período activo. */
  readonly summary = computed(() =>
    this.dashboardService.calculateSummary(this.allTransactions(), this.period()),
  );
  /** Desglose de gastos por categoría del período activo para el gráfico de torta. */
  readonly breakdown = computed(() =>
    this.dashboardService.calculateBreakdown(this.allTransactions(), this.allCategories(), this.period()),
  );
  /** Últimas transacciones del período activo para mostrar en la lista reciente. */
  readonly recentTransactions = computed(() =>
    this.dashboardService.getRecentTransactions(this.allTransactions(), this.period()),
  );
  /** Presupuestos del período activo que superaron el 100% del monto asignado. */
  readonly exceededBudgets = computed(() =>
    this.allBudgets().filter(b => b.period === this.period() && b.status === BUDGET_STATUS.EXCEEDED),
  );
  /** Todos los presupuestos del período activo para mostrar resumen en el dashboard. */
  readonly currentPeriodBudgets = computed(() =>
    this.allBudgets().filter(b => b.period === this.period()),
  );
  /** True cuando hay al menos una transacción en el período activo. */
  readonly hasDataInPeriod = computed(() =>
    this.summary().totalIncome > 0 || this.summary().totalExpenses > 0,
  );

  constructor() {
    addIcons({ logOutOutline, addOutline, trendingUpOutline, trendingDownOutline, settingsOutline });
  }

  ngOnInit(): void {
    this.store.dispatch(TransactionsActions.loadTransactions());
    this.store.dispatch(BudgetsActions.loadBudgets());
    this.store.dispatch(WalletsActions.loadWallets());
    this.store.dispatch(CategoriesActions.loadCategories());
  }

  onPeriodChange(p: string): void {
    this.period.set(p);
  }

  async openAddModal(initialType: 'income' | 'expense'): Promise<void> {
    const user = this.authService.getUser();
    if (!user) return;
    const modal = await this.modalCtrl.create({
      component: TransactionFormComponent,
      componentProps: { userId: user.sub, userBaseCurrency: 'EUR', initialType },
      backdropDismiss: true,
    });
    await modal.present();
  }

  navigateToSettings(): void {
    this.router.navigate(['/tabs/settings']);
  }

  navigateToBudgets(): void {
    this.router.navigate(['/tabs/budgets']);
  }

  async handleSignOut(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro que querés cerrar la sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar sesión',
          role: 'destructive',
          handler: () => {
            this.authService.signOut();
            this.router.navigate(['/login'], { replaceUrl: true });
          },
        },
      ],
    });
    await alert.present();
  }
}
