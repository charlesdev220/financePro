import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AlertController, ModalController } from '@ionic/angular/standalone';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonInput,
  IonNote, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronDownOutline, checkmarkOutline } from 'ionicons/icons';
import { CategoriesStateService } from '@core/state/categories.state';
import { ICategory } from '@models/category.model';

const ICON_OPTIONS = ['🏠', '🍔', '🚗', '✈️', '💊', '👕', '📱', '🎬', '📚', '💰', '🏋️', '🎵', '🐶', '💼', '🎮', '🏦', '💳', '🛒', '⚡', '🔧'];
const COLOR_OPTIONS: { label: string; value: string }[] = [
  { label: 'Rojo',       value: '#F44336' },
  { label: 'Rosa',       value: '#E91E63' },
  { label: 'Violeta',    value: '#9C27B0' },
  { label: 'Púrpura',    value: '#673AB7' },
  { label: 'Índigo',     value: '#3F51B5' },
  { label: 'Azul',       value: '#2196F3' },
  { label: 'Cian',       value: '#00BCD4' },
  { label: 'Verde agua', value: '#009688' },
  { label: 'Verde',      value: '#4CAF50' },
  { label: 'Lima',       value: '#8BC34A' },
  { label: 'Amarillo',   value: '#CDDC39' },
  { label: 'Ámbar',      value: '#FFC107' },
  { label: 'Naranja',    value: '#FF9800' },
  { label: 'Coral',      value: '#FF5722' },
  { label: 'Marrón',     value: '#795548' },
  { label: 'Gris',       value: '#9E9E9E' },
  { label: 'Pizarra',    value: '#607D8B' },
];

@Component({
  selector: 'app-category-form',
  templateUrl: 'category-form.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel, IonInput,
    IonNote, IonIcon,
  ],
})
export class CategoryFormComponent implements OnInit {
  /**
   * Excepción arquitectónica: se usa @Input() legacy en lugar de input() signal-based.
   * Motivo: Ionic ModalController.create({ componentProps }) asigna props directamente
   * sobre la instancia (component.category = value), sin pasar por Angular signals.
   * Usar input<T>() provoca "TypeError: this.category is not a function" en runtime.
   */
  @Input() category?: ICategory;
  /** @see category — misma excepción. */
  @Input() userId?: string;
  /** @see category — misma excepción. */
  @Input() rowNumber?: number;

  private readonly fb               = inject(FormBuilder);
  private readonly categoriesState  = inject(CategoriesStateService);
  private readonly modalCtrl        = inject(ModalController);
  private readonly alertCtrl        = inject(AlertController);

  form!: FormGroup;
  readonly icons = signal<string[]>([...ICON_OPTIONS]);
  readonly colorOptions = COLOR_OPTIONS;

  /** Signal espejo del tipo del FormGroup — fuente de verdad reactiva para OnPush. */
  readonly selectedType = signal<'expense' | 'income'>('expense');

  /** Controla la visibilidad del grid de iconos. */
  readonly showIconPicker = signal(false);
  /** Controla la visibilidad del grid de swatches de color. */
  readonly showColorPicker = signal(false);
  /** Controla la visibilidad del selector de período como accordion. */
  readonly showPeriodPicker = signal(false);

  readonly PERIOD_OPTIONS = [
    { value: 'monthly', label: 'Mensual' },
    { value: 'weekly',  label: 'Semanal' },
    { value: 'custom',  label: 'Personalizado' },
  ];

  /** True cuando se recibió una categoría existente, indicando modo edición. */
  get isEditMode(): boolean { return !!this.category; }

  get periodLabel(): string {
    const val = this.form?.get('budgetPeriod')?.value;
    return this.PERIOD_OPTIONS.find(o => o.value === val)?.label ?? '';
  }

  constructor() {
    addIcons({ chevronDownOutline, checkmarkOutline });
  }

  ngOnInit(): void {
    const cat = this.category;
    this.form = this.fb.group({
      name: [cat?.name ?? '', [Validators.required, Validators.minLength(1)]],
      icon: [cat?.icon ?? '📂', Validators.required],
      color: [cat?.color ?? '#9E9E9E', Validators.required],
      type: [cat?.type ?? 'expense', Validators.required],
      budgetAmount: [cat?.budgetAmount ?? null],
      budgetPeriod: [cat?.budgetPeriod ?? 'monthly'],
    });
    this.selectedType.set((this.form.get('type')?.value ?? 'expense') as 'expense' | 'income');
  }

  onTypeSelect(type: 'expense' | 'income'): void {
    this.form.get('type')?.setValue(type);
    this.selectedType.set(type);
  }

  onIconSelect(icon: string): void {
    this.form.get('icon')?.setValue(icon);
    this.showIconPicker.set(false);
  }

  onColorSelect(value: string): void {
    this.form.get('color')?.setValue(value);
    this.showColorPicker.set(false);
  }

  onPeriodSelect(value: string): void {
    this.form.get('budgetPeriod')?.setValue(value);
    this.showPeriodPicker.set(false);
  }

  addCustomIcon(emoji: string): void {
    const trimmed = emoji.trim();
    if (!trimmed) return;
    this.icons.update(list => [...list, trimmed]);
    this.onIconSelect(trimmed);
  }

  async openAddIconAlert(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Agregar emoji',
      message: 'Escribí o pegá un emoji para usarlo como ícono.',
      inputs: [{ name: 'emoji', type: 'text', placeholder: '🎯' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Agregar',
          handler: (data: { emoji: string }) => {
            if (data.emoji?.trim()) this.addCustomIcon(data.emoji.trim());
          },
        },
      ],
    });
    await alert.present();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const now = new Date().toISOString();

    if (this.category && this.rowNumber) {
      const updated: ICategory = {
        ...this.category,
        ...value,
        budgetAmount: value.budgetAmount ? Number(value.budgetAmount) : null,
      };
      this.categoriesState.update(updated, this.rowNumber);
    } else {
      const newCategory: ICategory = {
        categoryId: crypto.randomUUID(),
        userId: this.userId!,
        name: value.name.trim(),
        icon: value.icon,
        color: value.color,
        type: value.type,
        budgetAmount: value.budgetAmount ? Number(value.budgetAmount) : null,
        budgetPeriod: value.budgetPeriod,
        isActive: true,
        createdAt: now,
      };
      this.categoriesState.add(newCategory);
    }
    await this.modalCtrl.dismiss();
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}
