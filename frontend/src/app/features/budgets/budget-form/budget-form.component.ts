import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonIcon,
  IonNote,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronDownOutline, chevronUpOutline } from 'ionicons/icons';
import { BudgetsStateService } from '@core/state/budgets.state';
import { CategoriesStateService } from '@core/state/categories.state';
import { TransactionsStateService } from '@core/state/transactions.state';
import { AuthService } from '@core/services/auth.service';
import { IBudget } from '@models/budget.model';
import { BUDGET_STATUS } from '@core/constants/budget.constants';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

@Component({
  selector: 'app-budget-form',
  templateUrl: 'budget-form.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonIcon,
    IonNote,
  ],
})
export class BudgetFormComponent implements OnInit {
  /**
   * Excepción arquitectónica: se usa @Input() decorador legacy en lugar de input() signal-based.
   * Motivo: Ionic ModalController.create({ componentProps }) asigna las props directamente
   * sobre la instancia del componente como propiedades planas (component.budget = value),
   * sin pasar por el mecanismo de Angular signals. Usar input<T>() provoca
   * "TypeError: this.budget is not a function" en runtime al invocar this.budget().
   */
  @Input() budget?: IBudget;
  /** @see budget — misma excepción, valor de período pre-seleccionado para nuevos presupuestos. */
  @Input() period?: string;
  /** @see budget — número de fila en Sheets para actualizar en modo edición. */
  @Input() rowNumber?: number;

  private readonly fb               = inject(FormBuilder);
  private readonly budgetsState     = inject(BudgetsStateService);
  private readonly categoriesState  = inject(CategoriesStateService);
  private readonly txState          = inject(TransactionsStateService);
  private readonly modalCtrl        = inject(ModalController);
  private readonly authService      = inject(AuthService);

  form!: FormGroup;

  /** True cuando se recibió un presupuesto existente, indicando modo edición. */
  get isEditMode(): boolean { return !!this.budget; }

  /** Categorías de tipo gasto para el grid del accordion de categoría. */
  readonly expenseCategories = computed(() =>
    this.categoriesState.items().filter(c => c.type === 'expense')
  );

  /** Controla la visibilidad del grid de tiles de categoría. */
  showCategoryPicker = signal(false);

  /** Signal espejo del categoryId del FormGroup — fuente de verdad reactiva para OnPush. */
  readonly selectedCategoryId = signal<string>('');

  /** Categoría seleccionada actualmente, para mostrar en el accordion cerrado. */
  readonly selectedCategory = computed(() =>
    this.expenseCategories().find(c => c.categoryId === this.selectedCategoryId())
  );

  onToggleCategoryPicker(): void {
    this.showCategoryPicker.update(v => !v);
  }

  onSelectCategory(categoryId: string): void {
    this.form.get('categoryId')?.setValue(categoryId);
    this.form.get('categoryId')?.markAsDirty();
    this.selectedCategoryId.set(categoryId);
    this.showCategoryPicker.set(false);
  }

  ngOnInit(): void {
    addIcons({ chevronDownOutline, chevronUpOutline });
    const defaultPeriod = this.budget?.period ?? this.period ?? new Date().toISOString().slice(0, 7);
    const b = this.budget;
    this.form = this.fb.group({
      categoryId:   [b?.categoryId ?? '', Validators.required],
      period:       [defaultPeriod, Validators.required],
      budgetAmount: [b?.budgetAmount ?? null, [Validators.required, Validators.min(1)]],
    });
    this.selectedCategoryId.set(this.form.get('categoryId')?.value ?? '');
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const now   = new Date().toISOString();
    const b     = this.budget;
    const rn    = this.rowNumber;

    if (b && rn) {
      const updatedBudget: IBudget = {
        ...b,
        categoryId:   value.categoryId,
        period:       value.period,
        budgetAmount: Number(value.budgetAmount),
        lastUpdated:  now,
      };
      this.budgetsState.update(updatedBudget, rn);
    } else {
      const user = this.authService.getUser();
      if (!user) return;

      const budgetAmount = Number(value.budgetAmount);
      const spentAmount  = this.txState.items()
        .filter(t =>
          t.type === TRANSACTION_TYPES.EXPENSE &&
          t.categoryId === value.categoryId &&
          t.date.startsWith(value.period),
        )
        .reduce((sum, t) => sum + t.amountBase, 0);

      const newBudget: IBudget = {
        budgetId:     crypto.randomUUID(),
        userId:       user.sub,
        categoryId:   value.categoryId,
        period:       value.period,
        budgetAmount,
        spentAmount,
        status:       spentAmount >= budgetAmount ? 'exceeded' : spentAmount >= budgetAmount * 0.8 ? 'warning' : BUDGET_STATUS.OK,
        lastUpdated:  now,
      };
      this.budgetsState.save(newBudget);
    }

    await this.modalCtrl.dismiss();
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}
