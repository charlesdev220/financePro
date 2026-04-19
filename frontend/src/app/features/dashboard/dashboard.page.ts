import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon,
  IonCard, IonCardContent, IonList, IonItem, IonLabel, IonNote, IonBadge,
  AlertController, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, addOutline, trendingUpOutline, trendingDownOutline, settingsOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
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
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { RelativeDatePipe } from '../../shared/pipes/relative-date.pipe';
import { ITransaction } from '../../models/transaction.model';
import { ICategory } from '../../models/category.model';
import { IBudget } from '../../models/budget.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon,
    IonCard, IonCardContent, IonList, IonItem, IonLabel, IonNote, IonBadge,
    DashboardSummaryComponent, DashboardChartComponent,
    PeriodSelectorComponent,
    CurrencyFormatPipe, RelativeDatePipe,
  ],
})
export class DashboardPage implements OnInit {
  private readonly store = inject(Store);
  private readonly modalCtrl = inject(ModalController);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  readonly period = signal(new Date().toISOString().slice(0, 7));

  private readonly allTransactions = toSignal(this.store.select(selectAllTransactions), { initialValue: [] as ITransaction[] });
  private readonly allCategories = toSignal(this.store.select(selectActiveCategories), { initialValue: [] as ICategory[] });
  private readonly allBudgets = toSignal(this.store.select(selectAllBudgets), { initialValue: [] as IBudget[] });

  readonly summary = computed(() =>
    this.dashboardService.calculateSummary(this.allTransactions(), this.period()),
  );
  readonly breakdown = computed(() =>
    this.dashboardService.calculateBreakdown(this.allTransactions(), this.allCategories(), this.period()),
  );
  readonly recentTransactions = computed(() =>
    this.dashboardService.getRecentTransactions(this.allTransactions(), this.period()),
  );
  readonly exceededBudgets = computed(() =>
    this.allBudgets().filter(b => b.period === this.period() && b.status === 'exceeded'),
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
      backdropDismiss: false,
    });
    await modal.present();
  }

  navigateToSettings(): void {
    this.router.navigate(['/tabs/settings']);
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
