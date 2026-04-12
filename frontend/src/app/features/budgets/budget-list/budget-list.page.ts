import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon,
  IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel,
  IonFab, IonFabButton, IonNote,
  ModalController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline } from 'ionicons/icons';
import { BudgetsActions } from '../../../store/budgets/budgets.actions';
import { selectAllBudgets, selectBudgetsRowMap } from '../../../store/budgets/budgets.selectors';
import { IBudget } from '../../../models/budget.model';
import { PeriodSelectorComponent } from '../../../shared/components/period-selector/period-selector.component';
import { BudgetIndicatorComponent } from '../../../shared/components/budget-indicator/budget-indicator.component';
import { BudgetFormComponent } from '../budget-form/budget-form.component';

@Component({
  selector: 'app-budget-list',
  templateUrl: 'budget-list.page.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon,
    IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel,
    IonFab, IonFabButton, IonNote,
    PeriodSelectorComponent, BudgetIndicatorComponent,
  ],
})
export class BudgetListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  readonly currentPeriod = signal(new Date().toISOString().slice(0, 7));

  private readonly _allBudgets = toSignal(this.store.select(selectAllBudgets), { initialValue: [] });
  private readonly rowMap = toSignal(this.store.select(selectBudgetsRowMap), { initialValue: {} as Record<string, number> });

  readonly budgets = computed(() => {
    const period = this.currentPeriod();
    return this._allBudgets().filter(b => b.period === period);
  });

  constructor() {
    addIcons({ addOutline, trashOutline });
  }

  ngOnInit(): void {
    this.store.dispatch(BudgetsActions.loadBudgets());
  }

  onPeriodChange(p: string): void {
    this.currentPeriod.set(p);
  }

  async openAddModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: BudgetFormComponent,
      componentProps: { period: this.currentPeriod() },
    });
    await modal.present();
  }

  async openEditModal(budget: IBudget): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: BudgetFormComponent,
      componentProps: { budget, rowNumber: this.rowMap()[budget.budgetId] },
    });
    await modal.present();
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
