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
  IonFab,
  IonFabButton,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, barChartOutline } from 'ionicons/icons';
import { BudgetsStateService } from '@core/state/budgets.state';
import { CategoriesStateService } from '@core/state/categories.state';
import { CurrencyStateService } from '@core/state/currency.state';
import { IBudget } from '@models/budget.model';
import { PeriodSelectorComponent } from '@shared/components/period-selector/period-selector.component';
import { BudgetIndicatorComponent } from '@shared/components/budget-indicator/budget-indicator.component';
import { BudgetFormComponent } from '@features/budgets/budget-form/budget-form.component';

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
    IonFab,
    IonFabButton,
    IonFab,
    IonFabButton,
    PeriodSelectorComponent,
    BudgetIndicatorComponent,
  ],
})
export class BudgetListPage implements OnInit {
  private readonly budgetsState = inject(BudgetsStateService);
  private readonly categoriesState = inject(CategoriesStateService);
  private readonly currencyState = inject(CurrencyStateService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  readonly currentPeriod = signal(new Date().toISOString().slice(0, 7));

  /** Todos los presupuestos del usuario desde el state service. */
  private readonly _allBudgets = this.budgetsState.items;
  /** Mapa budgetId → rowNumber en Sheets, necesario para edición y borrado. */
  private readonly rowMap = this.budgetsState.rowMap;

  /** Categorías del usuario para resolver nombre en la lista de presupuestos. */
  private readonly categories = this.categoriesState.items;
  /** Moneda base del usuario. Fallback 'EUR' antes de cargar. */
  readonly userBaseCurrency = computed(() => this.currencyState.baseCurrency() ?? 'EUR');

  /** Presupuestos filtrados por el período seleccionado actualmente. */
  readonly budgets = computed(() => {
    const period = this.currentPeriod();
    return this._allBudgets().filter(b => b.period === period);
  });

  constructor() {
    addIcons({ addOutline, trashOutline, barChartOutline });
  }

  ngOnInit(): void {
    this.budgetsState.load();
    this.categoriesState.load();
    this.currencyState.load();
  }

  onPeriodChange(p: string): void {
    this.currentPeriod.set(p);
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

  getCategoryName(categoryId: string): string {
    return this.categories().find(c => c.categoryId === categoryId)?.name ?? 'Sin categoría';
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
