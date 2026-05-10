import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonButton,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, barChartOutline } from 'ionicons/icons';
import { BudgetsStateService } from '@core/state/budgets.state';
import { CategoriesStateService } from '@core/state/categories.state';
import { CurrencyStateService } from '@core/state/currency.state';
import { TransactionsStateService } from '@core/state/transactions.state';
import { IBudget } from '@models/budget.model';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';
import { PeriodSelectorComponent } from '@shared/components/period-selector/period-selector.component';
import { PeriodTab } from '@core/constants/period.constants';
import { BudgetIndicatorComponent } from '@shared/components/budget-indicator/budget-indicator.component';
import { BudgetFormComponent } from '@features/budgets/budget-form/budget-form.component';
import { APP_COLORS } from '@core/constants/colors.constants';

@Component({
  selector: 'app-budget-list',
  templateUrl: 'budget-list.page.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonIcon,
    IonButton,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonLabel,
    PeriodSelectorComponent,
    BudgetIndicatorComponent,
  ],
})
export class BudgetListPage implements OnInit {
  private readonly budgetsState = inject(BudgetsStateService);
  private readonly categoriesState = inject(CategoriesStateService);
  private readonly currencyState = inject(CurrencyStateService);
  private readonly txState = inject(TransactionsStateService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  /** Mes actual en formato YYYY-MM — siempre el mes en curso, independiente del tab activo. */
  readonly currentPeriod = computed(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  /** Tab activo en el selector de período — two-way binding con PeriodSelectorComponent. */
  readonly activePeriodTab = signal<PeriodTab>('month');

  private readonly _allBudgets = this.budgetsState.items;
  private readonly rowMap = this.budgetsState.rowMap;
  private readonly categories = this.categoriesState.items;

  /** Moneda base del usuario. Fallback 'EUR' antes de cargar. */
  readonly userBaseCurrency = computed(() => this.currencyState.baseCurrency() ?? 'EUR');

  /**
   * Presupuestos del período enriquecidos con spentAmount recalculado desde las
   * transacciones en vivo (igual que DashboardPage.budgetsForPeriod) y el color
   * de la categoría para la barra del indicador.
   */
  readonly budgets = computed(() => {
    const period = this.currentPeriod();
    const txs = this.txState.items();
    const cats = this.categories();

    return this._allBudgets()
      .filter(b => b.period === period)
      .map(b => {
        const cat = cats.find(c => c.categoryId === b.categoryId);
        const spentAmount = txs
          .filter(t =>
            t.type === TRANSACTION_TYPES.EXPENSE &&
            t.categoryId === b.categoryId &&
            t.date.startsWith(period),
          )
          .reduce((sum, t) => sum + (isNaN(t.amountBase) ? 0 : t.amountBase), 0);

        return {
          ...b,
          spentAmount,
          categoryName: cat?.name ?? 'Sin categoría',
          categoryColor: cat?.color ?? APP_COLORS.GREEN,
        };
      });
  });

  constructor() {
    addIcons({ addOutline, trashOutline, barChartOutline });
  }

  ngOnInit(): void {
    this.budgetsState.load();
    this.categoriesState.load();
    this.currencyState.load();
    this.txState.load();
  }

  async openAddModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: BudgetFormComponent,
      componentProps: { period: this.currentPeriod() },
      backdropDismiss: true,
    });
    await modal.present();
  }

  async openEditModal(budget: IBudget): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: BudgetFormComponent,
      componentProps: { budget, rowNumber: this.rowMap()[budget.budgetId] },
      backdropDismiss: true,
    });
    await modal.present();
  }

  async deleteBudget(budget: IBudget): Promise<void> {
    const rowNumber = this.rowMap()[budget.budgetId];
    if (!rowNumber) return;
    this.budgetsState.delete(budget.budgetId, rowNumber);
    const toast = await this.toastCtrl.create({
      message: 'Presupuesto eliminado',
      duration: 2000,
      color: 'medium',
    });
    await toast.present();
  }
}
