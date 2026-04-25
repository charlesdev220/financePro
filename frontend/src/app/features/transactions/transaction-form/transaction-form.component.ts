import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal, output } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonItem, IonTextarea, IonIcon, IonToggle,
  ModalController,
} from '@ionic/angular/standalone';
import { OptionPickerComponent, PickerItem } from '@shared/components/option-picker/option-picker.component';
import { backspaceOutline, calendarOutline, cashOutline, walletOutline, arrowBackOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { TransactionsActions } from '@store/transactions/transactions.actions';
import { selectByType } from '@store/categories/categories.selectors';
import { selectAllWallets } from '@store/wallets/wallets.selectors';
import { selectAllBudgets } from '@store/budgets/budgets.selectors';
import { ITransaction } from '@models/transaction.model';
import { IBudget } from '@models/budget.model';
import { BudgetIndicatorComponent } from '@shared/components/budget-indicator/budget-indicator.component';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'ARS', 'BRL', 'MXN', 'CLP', 'COP'];

/**
 * TransactionFormComponent — Formulario reactivo para la creación y edición de transacciones.
 * Integra autocompletado de conceptos basado en IA/Histórico, indicadores de presupuesto
 * en tiempo real y gestión de estado mediante NgRx.
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
  private readonly store = inject(Store);
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
  private readonly allBudgets = toSignal(
    this.store.select(selectAllBudgets), { initialValue: [] as IBudget[] }
  );

  /** Categorías de tipo gasto disponibles. */
  private readonly expenseCategories = toSignal(
    this.store.select(selectByType('expense')), { initialValue: [] },
  );

  /** Categorías de tipo ingreso disponibles. */
  private readonly incomeCategories = toSignal(
    this.store.select(selectByType('income')), { initialValue: [] },
  );

  /** Carteras disponibles del usuario. */
  readonly wallets = toSignal(
    this.store.select(selectAllWallets), { initialValue: [] }
  );

  /** Estado reactivo interno que rastrea el tipo seleccionado en el UI. */
  readonly typeValue = signal<'income' | 'expense'>('expense');


  /** Icono de la categoría seleccionada actualmente para visualización en el grid. */
  readonly selectedCategoryIcon = computed(() => {
    const catId = this.form?.get('categoryId')?.value;
    return this.filteredCategories().find(c => c.categoryId === catId)?.icon || '📂';
  });

  /** Nombre de la categoría seleccionada para mostrar en el tile del selector. */
  readonly selectedCategoryName = computed(() =>
    this.filteredCategories().find(c => c.categoryId === this.form?.get('categoryId')?.value)?.name ?? 'Seleccioná'
  );

  /** Cartera seleccionada actualmente para mostrar en el tile. */
  readonly selectedWallet = computed(() =>
    this.wallets().find(w => w.walletId === this.form?.get('walletId')?.value)
  );

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

    // 1. Inicialización inmediata para estabilidad en el renderizado
    this.form = this.fb.group({
      type: [initialType, Validators.required],
      amount: [tx?.amount ?? null, [Validators.required, Validators.min(0.01)]],
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

    // 2. Población defensiva de valores por defecto
    const wallets = this.wallets();
    const categories = this.filteredCategories();
    
    if (wallets.length > 0 || categories.length > 0) {
      this.form.patchValue({
        walletId: tx?.walletId ?? wallets[0]?.walletId ?? '',
        categoryId: tx?.categoryId ?? categories[0]?.categoryId ?? '',
      });
    }

    // 3. Suscripción reactiva a cambios de tipo para actualizar filtros en cascada
    this.form.get('type')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => {
        this.typeValue.set(v as 'income' | 'expense');
        const firstCategory = this.filteredCategories()[0];
        this.form.patchValue({ categoryId: firstCategory?.categoryId ?? '' });
      });
  }

  /**
   * Valida y persiste la transacción disparando la acción de NgRx correspondiente.
   */
  async save(): Promise<void> {
    if (this.form.invalid) return;

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
      this.store.dispatch(
        TransactionsActions.updateTransaction({
          transaction: updated,
          rowNumber: rn,
          userBaseCurrency: this.userBaseCurrency(),
        }),
      );
    } else {
      this.store.dispatch(
        TransactionsActions.addTransaction({ draft, userBaseCurrency: this.userBaseCurrency() }),
      );
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
    if (role === 'confirm') this.form.get('walletId')?.setValue(data.value);
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
    if (role === 'confirm') this.form.get('categoryId')?.setValue(data.value);
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
    if (role === 'confirm') this.form.get('currency')?.setValue(data.value);
  }

  onRecurringToggle(checked: boolean): void {
    this.form.get('isRecurring')?.setValue(checked);
  }

  /**
   * Maneja las pulsaciones de los botones del teclado numérico.
   */
  onNumberPress(key: string): void {
    const current = this.amountString();
    
    // Evitar múltiples ceros iniciales
    if (current === '0' && key === '0') return;
    
    // Manejar punto decimal
    if (key === '.') {
      if (current.includes('.')) return;
      this.amountString.set(current + '.');
      return;
    }

    // Reemplazar cero inicial si no es para un decimal
    if (current === '0' && key !== '.') {
      this.amountString.set(key);
    } else {
      // Limitar a 2 decimales
      if (current.includes('.')) {
        const decimals = current.split('.')[1];
        if (decimals.length >= 2) return;
      }
      this.amountString.set(current + key);
    }

    this.updateFormAmount();
  }

  /**
   * Borra el último carácter introducido.
   */
  onDelete(): void {
    const current = this.amountString();
    if (current.length <= 1) {
      this.amountString.set('0');
    } else {
      this.amountString.set(current.slice(0, -1));
    }
    this.updateFormAmount();
  }

  /**
   * Sincroniza el string del teclado con el valor del formulario.
   */
  private updateFormAmount(): void {
    const val = parseFloat(this.amountString());
    this.form.get('amount')?.setValue(isNaN(val) ? 0 : val);
    this.form.get('amount')?.markAsDirty();
  }
}
