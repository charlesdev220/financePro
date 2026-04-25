import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
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
  IonSelect,
  IonSelectOption,
  IonNote,
  ModalController,
} from '@ionic/angular/standalone';
import { BudgetsActions } from '@store/budgets/budgets.actions';
import { selectByType } from '@store/categories/categories.selectors';
import { AuthService } from '@core/services/auth.service';
import { IBudget } from '@models/budget.model';
import { BUDGET_STATUS } from '@core/constants/budget.constants';

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
    IonSelect,
    IonSelectOption,
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

  private readonly fb          = inject(FormBuilder);
  private readonly store       = inject(Store);
  private readonly modalCtrl   = inject(ModalController);
  private readonly authService = inject(AuthService);

  form!: FormGroup;

  /** True cuando se recibió un presupuesto existente, indicando modo edición. */
  get isEditMode(): boolean { return !!this.budget; }

  /** Categorías de tipo gasto para el selector de categoría del presupuesto. */
  readonly expenseCategories = toSignal(
    this.store.select(selectByType('expense')),
    { initialValue: [] },
  );

  ngOnInit(): void {
    const defaultPeriod = this.budget?.period ?? this.period ?? new Date().toISOString().slice(0, 7);
    const b = this.budget;
    this.form = this.fb.group({
      categoryId:   [b?.categoryId ?? '', Validators.required],
      period:       [defaultPeriod, Validators.required],
      budgetAmount: [b?.budgetAmount ?? null, [Validators.required, Validators.min(1)]],
    });
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
      this.store.dispatch(BudgetsActions.updateBudget({ budget: updatedBudget, rowNumber: rn }));
    } else {
      const user = this.authService.getUser();
      if (!user) return;

      const newBudget: IBudget = {
        budgetId:     crypto.randomUUID(),
        userId:       user.sub,
        categoryId:   value.categoryId,
        period:       value.period,
        budgetAmount: Number(value.budgetAmount),
        spentAmount:  0,
        status:       BUDGET_STATUS.OK,
        lastUpdated:  now,
      };
      this.store.dispatch(BudgetsActions.saveBudget({ budget: newBudget }));
    }

    await this.modalCtrl.dismiss();
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}
