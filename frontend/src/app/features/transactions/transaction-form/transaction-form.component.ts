import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ModalController } from '@ionic/angular/standalone';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonInput, IonSelect,
  IonSelectOption, IonToggle, IonTextarea, IonNote,
} from '@ionic/angular/standalone';
import { BehaviorSubject } from 'rxjs';
import { TransactionsActions } from '../../../store/transactions/transactions.actions';
import { selectByType } from '../../../store/categories/categories.selectors';
import { selectAllWallets } from '../../../store/wallets/wallets.selectors';
import { selectAllBudgets } from '../../../store/budgets/budgets.selectors';
import { ITransaction } from '../../../models/transaction.model';
import { IBudget } from '../../../models/budget.model';
import { ConceptsService } from '../services/concepts.service';
import { AutocompleteInputComponent } from '../../../shared/components/autocomplete-input/autocomplete-input.component';
import { BudgetIndicatorComponent } from '../../../shared/components/budget-indicator/budget-indicator.component';
import { TRANSACTION_TYPES } from '../../../core/constants/transaction.constants';

const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'ARS', 'BRL', 'MXN', 'CLP', 'COP'];

@Component({
  selector: 'app-transaction-form',
  templateUrl: 'transaction-form.component.html',
  styleUrls: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonToggle, IonTextarea, IonNote,
    AutocompleteInputComponent,
    BudgetIndicatorComponent,
  ],
})
export class TransactionFormComponent implements OnInit {
  transaction      = input<ITransaction>();
  userId           = input.required<string>();
  userBaseCurrency = input.required<string>();
  rowNumber        = input<number>();
  initialType      = input<'income' | 'expense'>();

  private readonly fb              = inject(FormBuilder);
  private readonly store           = inject(Store);
  private readonly modalCtrl       = inject(ModalController);
  private readonly conceptsService = inject(ConceptsService);
  private readonly destroyRef      = inject(DestroyRef);

  form!: FormGroup;
  readonly currencies = SUPPORTED_CURRENCIES;

  /** True cuando se recibió una transacción existente, indicando modo edición. */
  readonly isEditMode = computed(() => !!this.transaction());

  /** Título del modal según contexto: edición, tipo prefijado o genérico. */
  readonly formTitle = computed(() => {
    if (this.isEditMode()) return 'Editar transacción';
    if (this.initialType() === 'income') return 'Nuevo ingreso';
    if (this.initialType() === 'expense') return 'Nuevo gasto';
    return 'Nueva transacción';
  });

  private conceptPrefix$ = new BehaviorSubject<string>('');

  /** Conceptos guardados del usuario para alimentar el autocompletado de concepto. */
  private readonly allConcepts = toSignal(
    this.conceptsService.loadConcepts(), { initialValue: [] },
  );

  readonly suggestions$ = new BehaviorSubject<string[]>([]);

  /** Todos los presupuestos del usuario para mostrar indicador al seleccionar categoría. */
  private readonly allBudgets = toSignal(this.store.select(selectAllBudgets), { initialValue: [] as IBudget[] });

  /** Categorías de tipo gasto para el selector cuando el tipo es expense. */
  private readonly expenseCategories = toSignal(
    this.store.select(selectByType('expense')), { initialValue: [] },
  );
  /** Categorías de tipo ingreso para el selector cuando el tipo es income. */
  private readonly incomeCategories = toSignal(
    this.store.select(selectByType('income')), { initialValue: [] },
  );
  /** Carteras del usuario para el selector de origen de la transacción. */
  readonly wallets = toSignal(this.store.select(selectAllWallets), { initialValue: [] });

  private readonly typeValue = signal<'income' | 'expense'>('expense');

  /** Categorías filtradas por el tipo de transacción seleccionado en el formulario. */
  readonly filteredCategories = computed(() =>
    this.typeValue() === TRANSACTION_TYPES.INCOME ? this.incomeCategories() : this.expenseCategories(),
  );

  getActiveBudget(): IBudget | null {
    const catId = this.form?.get('categoryId')?.value as string;
    const date  = this.form?.get('date')?.value as string;
    const type  = this.form?.get('type')?.value as string;
    if (!catId || !date || type !== TRANSACTION_TYPES.EXPENSE) return null;
    const period = date.slice(0, 7);
    return this.allBudgets().find(b => b.categoryId === catId && b.period === period) ?? null;
  }

  getBudgetWarning(): boolean {
    const budget = this.getActiveBudget();
    if (!budget) return false;
    const newAmount      = Number(this.form?.get('amount')?.value ?? 0);
    const tx             = this.transaction();
    const originalAmount = tx?.type === TRANSACTION_TYPES.EXPENSE ? (tx.amount ?? 0) : 0;
    const projectedSpent = budget.spentAmount - originalAmount + newAmount;
    return projectedSpent > budget.budgetAmount;
  }

  ngOnInit(): void {
    const tx          = this.transaction();
    const initialType = tx?.type ?? this.initialType() ?? TRANSACTION_TYPES.EXPENSE;

    const defaultWalletId   = tx?.walletId   ?? this.wallets()[0]?.walletId   ?? '';
    const defaultCategoryId = tx?.categoryId ?? this.filteredCategories()[0]?.categoryId ?? '';

    this.form = this.fb.group({
      type:           [initialType, Validators.required],
      amount:         [tx?.amount ?? null, [Validators.required, Validators.min(0.01)]],
      currency:       [tx?.currency ?? this.userBaseCurrency() ?? 'EUR', Validators.required],
      walletId:       [defaultWalletId, Validators.required],
      categoryId:     [defaultCategoryId, Validators.required],
      concept:        [tx?.concept ?? ''],
      date:           [tx?.date ?? new Date().toISOString().split('T')[0], Validators.required],
      isRecurring:    [tx?.isRecurring ?? false],
      recurrenceRule: [tx?.recurrenceRule ?? null],
      notes:          [tx?.notes ?? ''],
    });

    this.typeValue.set(initialType as 'income' | 'expense');

    this.form.get('type')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => {
        this.typeValue.set(v as 'income' | 'expense');
        // Al cambiar el tipo, la lista de categorías cambia: preseleccionar la primera
        const firstCategory = this.filteredCategories()[0];
        this.form.patchValue({ categoryId: firstCategory?.categoryId ?? '' });
      });
  }

  onConceptInput(prefix: string): void {
    const catId = this.form.get('categoryId')?.value;
    if (!catId) return;
    const suggestions = this.conceptsService.getSuggestions(catId, prefix, this.allConcepts());
    this.suggestions$.next(suggestions);
  }

  onConceptSelected(text: string): void {
    this.form.patchValue({ concept: text });
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const draft = {
      userId:         this.userId(),
      walletId:       value.walletId,
      categoryId:     value.categoryId,
      amount:         Number(value.amount),
      currency:       value.currency,
      concept:        (value.concept ?? '').trim(),
      date:           value.date,
      type:           value.type,
      isRecurring:    value.isRecurring,
      recurrenceRule: value.isRecurring ? (value.recurrenceRule ?? 'monthly') : null,
      notes:          (value.notes ?? '').trim() || null,
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
          transaction:      updated,
          rowNumber:        rn,
          userBaseCurrency: this.userBaseCurrency(),
        }),
      );
    } else {
      this.store.dispatch(
        TransactionsActions.addTransaction({ draft, userBaseCurrency: this.userBaseCurrency() }),
      );
    }

    await this.modalCtrl.dismiss();
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}
