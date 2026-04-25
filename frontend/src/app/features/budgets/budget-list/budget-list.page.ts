import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
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
import { TransactionsActions } from '@store/transactions/transactions.actions';
import { BudgetsActions } from '@store/budgets/budgets.actions';
import { CategoriesActions } from '@store/categories/categories.actions';
import { selectAllBudgets, selectBudgetsRowMap } from '@store/budgets/budgets.selectors';
import { map } from 'rxjs';
import { selectBaseCurrency } from '@store/currency/currency.selectors';
import { selectAllCategories } from '@store/categories/categories.selectors';
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
    PeriodSelectorComponent,
    BudgetIndicatorComponent,
  ],
})
export class BudgetListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  readonly currentPeriod = signal(new Date().toISOString().slice(0, 7));

  /** Todos los presupuestos del usuario desde el store NgRx. */
  private readonly _allBudgets = toSignal(this.store.select(selectAllBudgets), { initialValue: [] });
  /** Mapa budgetId → rowNumber en Sheets, necesario para edición y borrado. */
  private readonly rowMap = toSignal(this.store.select(selectBudgetsRowMap), { initialValue: {} as Record<string, number> });

  /** Categorías del usuario para resolver nombre en la lista de presupuestos. */
  private readonly categories = toSignal(this.store.select(selectAllCategories), { initialValue: [] });
  /** Moneda base del usuario desde USER_SETTINGS via NgRx. Fallback 'EUR' antes de cargar. */
  readonly userBaseCurrency = toSignal(
    this.store.select(selectBaseCurrency).pipe(map(c => c ?? 'EUR')),
    { initialValue: 'EUR' }
  );

  /** Presupuestos filtrados por el período seleccionado actualmente. */
  readonly budgets = computed(() => {
    const period = this.currentPeriod();
    return this._allBudgets().filter(b => b.period === period);
  });

  constructor() {
    addIcons({ addOutline, trashOutline, barChartOutline });
  }

  ngOnInit(): void {
    this.store.dispatch(BudgetsActions.loadBudgets());
    this.store.dispatch(TransactionsActions.loadTransactions());
    this.store.dispatch(CategoriesActions.loadCategories());
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
    this.store.dispatch(BudgetsActions.deleteBudget({ budgetId: budget.budgetId, rowNumber }));
    const toast = await this.toastCtrl.create({
      message: 'Presupuesto eliminado',
      duration: 2000,
      color: 'medium',
    });
    await toast.present();
  }
}
