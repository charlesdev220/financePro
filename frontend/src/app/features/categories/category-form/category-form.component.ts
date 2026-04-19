import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ModalController } from '@ionic/angular/standalone';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonNote,
} from '@ionic/angular/standalone';
import { CategoriesActions } from '../../../store/categories/categories.actions';
import { ICategory } from '../../../models/category.model';

const ICON_OPTIONS = ['🏠', '🍔', '🚗', '✈️', '💊', '👕', '📱', '🎬', '📚', '💰', '🏋️', '🎵', '🐶', '💼', '🎮', '🏦', '💳', '🛒', '⚡', '🔧'];
const COLOR_OPTIONS = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B'];

@Component({
  selector: 'app-category-form',
  templateUrl: 'category-form.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonNote,
  ],
})
export class CategoryFormComponent implements OnInit {
  category = input<ICategory>();
  userId = input<string>();
  rowNumber = input<number>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly modalCtrl = inject(ModalController);

  form!: FormGroup;
  readonly icons = ICON_OPTIONS;
  readonly colors = COLOR_OPTIONS;

  /** True cuando se recibió una categoría existente, indicando modo edición. */
  readonly isEditMode = computed(() => !!this.category());

  ngOnInit(): void {
    const cat = this.category();
    this.form = this.fb.group({
      name: [cat?.name ?? '', [Validators.required, Validators.minLength(1)]],
      icon: [cat?.icon ?? '📂', Validators.required],
      color: [cat?.color ?? '#9E9E9E', Validators.required],
      type: [cat?.type ?? 'expense', Validators.required],
      budgetAmount: [cat?.budgetAmount ?? null],
      budgetPeriod: [cat?.budgetPeriod ?? 'monthly'],
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const now = new Date().toISOString();
    const cat = this.category();
    const rn = this.rowNumber();

    if (cat && rn) {
      const updated: ICategory = {
        ...cat,
        ...value,
        budgetAmount: value.budgetAmount ? Number(value.budgetAmount) : null,
      };
      this.store.dispatch(CategoriesActions.updateCategory({ category: updated, rowNumber: rn }));
    } else {
      const newCategory: ICategory = {
        categoryId: crypto.randomUUID(),
        userId: this.userId()!,
        name: value.name.trim(),
        icon: value.icon,
        color: value.color,
        type: value.type,
        budgetAmount: value.budgetAmount ? Number(value.budgetAmount) : null,
        budgetPeriod: value.budgetPeriod,
        isActive: true,
        createdAt: now,
      };
      this.store.dispatch(CategoriesActions.addCategory({ category: newCategory }));
    }
    await this.modalCtrl.dismiss();
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}
