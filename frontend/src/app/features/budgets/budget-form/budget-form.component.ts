import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonNote,
  ModalController,
} from '@ionic/angular/standalone';
import { BudgetsActions } from '../../../store/budgets/budgets.actions';
import { selectByType } from '../../../store/categories/categories.selectors';
import { AuthService } from '../../../core/services/auth.service';
import { IBudget } from '../../../models/budget.model';

@Component({
  selector: 'app-budget-form',
  templateUrl: 'budget-form.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonNote,
  ],
})
export class BudgetFormComponent implements OnInit {
  @Input() budget?: IBudget;
  @Input() period?: string;
  @Input() rowNumber?: number;

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly modalCtrl = inject(ModalController);
  private readonly authService = inject(AuthService);

  form!: FormGroup;

  readonly isEditMode = computed(() => !!this.budget);

  readonly expenseCategories = toSignal(
    this.store.select(selectByType('expense')),
    { initialValue: [] },
  );

  ngOnInit(): void {
    const defaultPeriod = this.budget?.period ?? this.period ?? new Date().toISOString().slice(0, 7);
    this.form = this.fb.group({
      categoryId:   [this.budget?.categoryId ?? '', Validators.required],
      period:       [defaultPeriod, Validators.required],
      budgetAmount: [this.budget?.budgetAmount ?? null, [Validators.required, Validators.min(1)]],
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const now = new Date().toISOString();

    if (this.budget && this.rowNumber) {
      // Modo edición: dispatch updateBudget
      const updatedBudget: IBudget = {
        ...this.budget,
        categoryId:   value.categoryId,
        period:       value.period,
        budgetAmount: Number(value.budgetAmount),
        lastUpdated:  now,
      };
      this.store.dispatch(
        BudgetsActions.updateBudget({ budget: updatedBudget, rowNumber: this.rowNumber }),
      );
    } else {
      // Modo creación: dispatch saveBudget
      const user = this.authService.getUser();
      if (!user) return;

      const newBudget: IBudget = {
        budgetId:     crypto.randomUUID(),
        userId:       user.sub,
        categoryId:   value.categoryId,
        period:       value.period,
        budgetAmount: Number(value.budgetAmount),
        spentAmount:  0,
        status:       'ok',
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
