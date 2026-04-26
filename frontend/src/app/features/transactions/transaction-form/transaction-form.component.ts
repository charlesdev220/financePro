import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonItem, IonTextarea, IonIcon, IonToggle,
  ModalController,
} from '@ionic/angular/standalone';
import { OptionPickerComponent, PickerItem } from '@shared/components/option-picker/option-picker.component';
import { backspaceOutline, calendarOutline, cashOutline, walletOutline, arrowBackOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { TransactionsStateService } from '@core/state/transactions.state';
import { WalletsStateService } from '@core/state/wallets.state';
import { CategoriesStateService } from '@core/state/categories.state';
import { BudgetsStateService } from '@core/state/budgets.state';
import { ITransaction } from '@models/transaction.model';
import { IBudget } from '@models/budget.model';
import { BudgetIndicatorComponent } from '@shared/components/budget-indicator/budget-indicator.component';
import { TRANSACTION_TYPES, TransactionType } from '@core/constants/transaction.constants';

const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'ARS', 'BRL', 'MXN', 'CLP', 'COP'];

/**
 * TransactionFormComponent — Formulario reactivo para la creación y edición de transacciones.
 * Integra autocompletado de conceptos basado en IA/Histórico, indicadores de presupuesto
 * en tiempo real y gestión de estado mediante Signal State Services.
 */
@Component({
  selector: 'app-transaction-form',
  templateUrl: 'transaction-form.component.html',
  styleUrls: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonItem, IonTextarea, IonIcon, IonToggle,
    BudgetIndicatorComponent,
  ],
})
export class TransactionFormComponent implements OnInit {
  /** Transacción existente para modo edición. (Signal Input) */
  transaction = input<ITransaction>();

  /** ID del usuario dueño de la transacción. (Signal Input requerido) */
  userId = input.required<string>();

  /** Divisa base del usuario para cálculos de balance. (Signal Input requerido) */
  userBaseCurrency = input.required<string>();

  /** Número de fila en Sheets para edición directa. (Signal Input) */
  rowNumber = input<number>();

  /** Tipo inicial sugerido (ingreso o gasto). (Signal Input) */
  initialType = input<'income' | 'expense'>();

  /** Emite una señal cuando se debe cerrar el modal o cancelar la operación. (Signal Output) */
  dismiss = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly txState = inject(TransactionsStateService);
  private readonly walletsState = inject(WalletsStateService);
  private readonly categoriesState = inject(CategoriesStateService);
  private readonly budgetsState = inject(BudgetsStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalCtrl = inject(ModalController);

  /** El FormGroup raíz para el formulario reactivo. */
  form!: FormGroup;

  /** Lista de divisas soportadas por la plataforma. */
  readonly currencies = SUPPORTED_CURRENCIES;

  /** Determina si el formulario está en modo edición basado en la presencia de una transacción. */
  readonly isEditMode = computed(() => !!this.transaction());

  /** Título dinámico del formulario según el contexto de uso. */
  readonly formTitle = computed(() => {
    if (this.isEditMode()) return 'Editar transacción';
    if (this.initialType() === 'income') return 'Nuevo ingreso';
    if (this.initialType() === 'expense') return 'Nuevo gasto';
    return 'Nueva transacción';
  });

  /** Todos los presupuestos para validación visual de límites de gasto. */
  private readonly allBudgets = this.budgetsState.items;

  /** Categorías de tipo gasto disponibles. */
  private readonly expenseCategories = computed(() =>
    this.categoriesState.items().filter(c => c.type === 'expense')
  );

  /** Categorías de tipo ingreso disponibles. */
  private readonly incomeCategories = computed(() =>
    this.categoriesState.items().filter(c => c.type === 'income')
  );

  /** Carteras disponibles del usuario. */
  readonly wallets = this.walletsState.items;

  /** Estado reactivo interno que rastrea el tipo seleccionado en el UI. */
  readonly typeValue = signal<TransactionType>(TRANSACTION_TYPES.EXPENSE);

  /** Signal espejo del categoryId del FormGroup — fuente de verdad reactiva para OnPush. */
  readonly selectedCategoryId = signal<string>('');
  /** Signal espejo del walletId del FormGroup — fuente de verdad reactiva para OnPush. */
  readonly selectedWalletId = signal<string>('');
  /** Signal espejo de la divisa del FormGroup — fuente de verdad reactiva para OnPush. */
  readonly selectedCurrency = signal<string>('EUR');

  /** Icono de la categoría seleccionada actualmente para visualización en el grid. */
  readonly selectedCategoryIcon = computed(() =>
    this.filteredCategories().find(c => c.categoryId === this.selectedCategoryId())?.icon ?? '📂'
  );

  /** Nombre de la categoría seleccionada para mostrar en el tile del selector. */
  readonly selectedCategoryName = computed(() =>
    this.filteredCategories().find(c => c.categoryId === this.selectedCategoryId())?.name ?? 'Seleccioná'
  );

  /** Cartera seleccionada actualmente para mostrar en el tile. */
  readonly selectedWallet = computed(() =>
    this.wallets().find(w => w.walletId === this.selectedWalletId())
  );

  /** Controla el accordion de pickers en web (≥768px). Mutex: solo uno abierto a la vez. */
  readonly openPicker = signal<'wallet' | 'category' | 'currency' | null>(null);

  /** Representación en string del monto para el teclado personalizado. */
  readonly amountString = signal<string>('0');

  /** Lista de categorías filtrada dinámicamente por el tipo de transacción actual. */
  readonly filteredCategories = computed(() =>
    this.typeValue() === TRANSACTION_TYPES.INCOME ? this.incomeCategories() : this.expenseCategories(),
  );

  /**
   * Obtiene el presupuesto asociado a la categoría y fecha seleccionadas.
   */
  getActiveBudget(): IBudget | null {
    const catId = this.form?.get('categoryId')?.value as string;
    const date = this.form?.get('date')?.value as string;
    const type = this.form?.get('type')?.value as string;
    if (!catId || !date || type !== TRANSACTION_TYPES.EXPENSE) return null;
    const period = date.slice(0, 7);
    return this.allBudgets().find(b => b.categoryId === catId && b.period === period) ?? null;
  }

  /**
   * Calcula si la transacción actual superaría el presupuesto de la categoría.
   */
  getBudgetWarning(): boolean {
    const budget = this.getActiveBudget();
    if (!budget) return false;
    const newAmount = Number(this.form?.get('amount')?.value ?? 0);
    const tx = this.transaction();
    const originalAmount = tx?.type === TRANSACTION_TYPES.EXPENSE ? (tx.amount ?? 0) : 0;
    const projectedSpent = budget.spentAmount - originalAmount + newAmount;
    return projectedSpent > budget.budgetAmount;
  }

  constructor() {
    addIcons({ backspaceOutline, calendarOutline, cashOutline, walletOutline, arrowBackOutline });
  }

  /**
   * Orquesta la inicialización reactiva del formulario.
   */
  ngOnInit(): void {
    const tx = this.transaction();
    const initialType = tx?.type ?? this.initialType() ?? TRANSACTION_TYPES.EXPENSE;

    if (tx?.amount) {
      this.amountString.set(tx.amount.toString());
    }

    this.form = this.fb.group({
      type: [initialType, Validators.required],
      amount: [tx?.amount ?? null, [Validators.required, Validators.min(-999999), Validators.max(999999)]],
      currency: [tx?.currency ?? this.userBaseCurrency() ?? 'EUR', Validators.required],
      walletId: ['', Validators.required],
      categoryId: ['', Validators.required],
      concept: [tx?.concept ?? ''],
      date: [tx?.date ?? new Date().toISOString().split('T')[0], Validators.required],
      isRecurring: [tx?.isRecurring ?? false],
      recurrenceRule: [tx?.recurrenceRule ?? null],
      notes: [tx?.notes ?? ''],
    });

    this.typeValue.set(initialType as 'income' | 'expense');

    const wallets = this.wallets();
    const categories = this.filteredCategories();

    if (wallets.length > 0 || categories.length > 0) {
      this.form.patchValue({
        walletId: tx?.walletId ?? wallets[0]?.walletId ?? '',
        categoryId: tx?.categoryId ?? categories[0]?.categoryId ?? '',
      });
    }

    this.selectedCategoryId.set(this.form.get('categoryId')?.value ?? '');
    this.selectedWalletId.set(this.form.get('walletId')?.value ?? '');
    this.selectedCurrency.set(this.form.get('currency')?.value ?? this.userBaseCurrency() ?? 'EUR');

    this.form.get('type')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => {
        this.typeValue.set(v as 'income' | 'expense');
        const firstCategory = this.filteredCategories()[0];
        this.form.patchValue({ categoryId: firstCategory?.categoryId ?? '' });
        this.selectedCategoryId.set(firstCategory?.categoryId ?? '');
      });
  }

  /**
   * Valida y persiste la transacción mediante el state service correspondiente.
   */
  async save(): Promise<void> {
    if (this.form.invalid) return;
    if (Number(this.form.get('amount')?.value) === 0) return;

    const value = this.form.getRawValue();
    const draft = {
      userId: this.userId(),
      walletId: value.walletId,
      categoryId: value.categoryId,
      amount: Number(value.amount),
      currency: value.currency,
      concept: (value.concept ?? '').trim(),
      date: value.date,
      type: value.type,
      isRecurring: value.isRecurring,
      recurrenceRule: value.isRecurring ? (value.recurrenceRule ?? 'monthly') : null,
      notes: (value.notes ?? '').trim() || null,
    };

    const tx = this.transaction();
    const rn = this.rowNumber();

    if (tx && rn) {
      const updated: ITransaction = {
        ...tx,
        ...draft,
        updatedAt: new Date().toISOString(),
      };
      this.txState.update(updated, rn, this.userBaseCurrency());
    } else {
      this.txState.add(draft, this.userBaseCurrency());
    }

    this.dismiss.emit();
  }

  /**
   * Cancela la operación y cierra la vista.
   */
  async cancel(): Promise<void> {
    this.dismiss.emit();
  }

  /**
   * Cambia el tipo de transacción entre ingreso y gasto, actualizando el form y los filtros.
   */
  onTypeToggle(type: 'income' | 'expense'): void {
    this.form.get('type')?.setValue(type);
  }

  async openWalletPicker(): Promise<void> {
    const items: PickerItem[] = this.wallets().map(w => ({
      value: w.walletId,
      label: w.name,
      icon: w.icon,
      sublabel: w.currency,
    }));
    const modal = await this.modalCtrl.create({
      component: OptionPickerComponent,
      componentProps: {
        title: 'Seleccioná una cartera',
        items,
        selectedValue: this.form.get('walletId')?.value ?? '',
        mode: 'cards',
      },
      breakpoints: [0, 0.6, 0.85],
      initialBreakpoint: 0.6,
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm') {
      this.form.get('walletId')?.setValue(data.value);
      this.selectedWalletId.set(data.value);
    }
  }

  async openCategoryPicker(): Promise<void> {
    const items: PickerItem[] = this.filteredCategories().map(c => ({
      value: c.categoryId,
      label: c.name,
      icon: c.icon,
      color: c.color,
    }));
    const modal = await this.modalCtrl.create({
      component: OptionPickerComponent,
      componentProps: {
        title: this.typeValue() === 'income' ? 'Categoría de ingreso' : 'Categoría de gasto',
        items,
        selectedValue: this.form.get('categoryId')?.value ?? '',
        mode: 'tiles',
      },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm') {
      this.form.get('categoryId')?.setValue(data.value);
      this.selectedCategoryId.set(data.value);
    }
  }

  async openCurrencyPicker(): Promise<void> {
    const items: PickerItem[] = this.currencies.map(c => ({ value: c, label: c }));
    const modal = await this.modalCtrl.create({
      component: OptionPickerComponent,
      componentProps: {
        title: 'Seleccioná una divisa',
        items,
        selectedValue: this.form.get('currency')?.value ?? 'EUR',
        mode: 'pills',
      },
      breakpoints: [0, 0.5],
      initialBreakpoint: 0.5,
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm') {
      this.form.get('currency')?.setValue(data.value);
      this.selectedCurrency.set(data.value);
    }
  }

  onWalletTileClick(): void {
    if (window.innerWidth >= 768) {
      this.openPicker.update(v => v === 'wallet' ? null : 'wallet');
    } else {
      this.openWalletPicker();
    }
  }

  onCategoryTileClick(): void {
    if (window.innerWidth >= 768) {
      this.openPicker.update(v => v === 'category' ? null : 'category');
    } else {
      this.openCategoryPicker();
    }
  }

  onCurrencyTileClick(): void {
    if (window.innerWidth >= 768) {
      this.openPicker.update(v => v === 'currency' ? null : 'currency');
    } else {
      this.openCurrencyPicker();
    }
  }

  onPickerWalletSelect(walletId: string): void {
    this.form.get('walletId')?.setValue(walletId);
    this.selectedWalletId.set(walletId);
    this.openPicker.set(null);
  }

  onPickerCategorySelect(categoryId: string): void {
    this.form.get('categoryId')?.setValue(categoryId);
    this.selectedCategoryId.set(categoryId);
    this.openPicker.set(null);
  }

  onPickerCurrencySelect(currency: string): void {
    this.form.get('currency')?.setValue(currency);
    this.selectedCurrency.set(currency);
    this.openPicker.set(null);
  }

  onWebAmountInputNative(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.amountString.set(val === '' ? '0' : val);
    this.updateFormAmount();
  }

  onRecurringToggle(checked: boolean): void {
    this.form.get('isRecurring')?.setValue(checked);
  }

  /** Alterna el signo del monto en el numpad. No opera si el monto es cero. */
  onToggleSign(): void {
    const current = this.amountString();
    if (current === '0') return;
    this.amountString.set(current.startsWith('-') ? current.slice(1) : '-' + current);
    this.updateFormAmount();
  }

  /** Sincroniza el input nativo web con amountString cuando el usuario escribe directamente. */
  onWebAmountInput(event: Event): void {
    const val = (event as CustomEvent).detail.value ?? '';
    this.amountString.set(val === '' ? '0' : String(val));
    this.updateFormAmount();
  }

  /** Maneja las pulsaciones del teclado numérico, preservando el signo actual. */
  onNumberPress(key: string): void {
    const current = this.amountString();
    const isNegative = current.startsWith('-');
    const abs = isNegative ? current.slice(1) : current;
    const sign = isNegative ? '-' : '';

    if (abs === '0' && key === '0') return;

    if (key === '.') {
      if (current.includes('.')) return;
      this.amountString.set(current + '.');
      return;
    }

    const digits = abs.replace('.', '').length;
    if (digits >= 6) return;

    if (abs === '0' && key !== '.') {
      this.amountString.set(sign + key);
    } else {
      if (abs.includes('.')) {
        const decimals = abs.split('.')[1];
        if (decimals.length >= 2) return;
      }
      this.amountString.set(sign + abs + key);
    }

    this.updateFormAmount();
  }

  /** Borra el último carácter introducido; resetea a '0' si el resultado sería vacío o solo '-'. */
  onDelete(): void {
    const current = this.amountString();
    const next = current.slice(0, -1);
    this.amountString.set(!next || next === '-' ? '0' : next);
    this.updateFormAmount();
  }

  /** Sincroniza el string del teclado con el valor del formulario. */
  private updateFormAmount(): void {
    const val = parseFloat(this.amountString());
    this.form.get('amount')?.setValue(isNaN(val) ? 0 : val);
    this.form.get('amount')?.markAsDirty();
  }
}
