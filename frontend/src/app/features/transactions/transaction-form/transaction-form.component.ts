import { Component, Input, OnInit, inject, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { ITransaction } from '../../../models/transaction.model';
import { ConceptsService } from '../services/concepts.service';
import { AutocompleteInputComponent } from '../../../shared/components/autocomplete-input/autocomplete-input.component';

const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'ARS', 'BRL', 'MXN', 'CLP', 'COP'];

@Component({
  selector: 'app-transaction-form',
  templateUrl: 'transaction-form.component.html',
  styleUrls: ['transaction-form.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonToggle, IonTextarea, IonNote,
    AutocompleteInputComponent,
  ],
})
export class TransactionFormComponent implements OnInit {
  /** Modo edición: si se pasa una transacción existente */
  @Input() transaction?: ITransaction;
  @Input() userId!: string;
  @Input() userBaseCurrency!: string;
  @Input() rowNumber?: number;

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly modalCtrl = inject(ModalController);
  private readonly conceptsService = inject(ConceptsService);

  form!: FormGroup;
  readonly currencies = SUPPORTED_CURRENCIES;
  readonly isEditMode = computed(() => !!this.transaction);

  private conceptPrefix$ = new BehaviorSubject<string>('');

  private readonly allConcepts = toSignal(
    this.conceptsService.loadConcepts(), { initialValue: [] },
  );

  readonly suggestions$ = new BehaviorSubject<string[]>([]);

  private readonly expenseCategories = toSignal(
    this.store.select(selectByType('expense')), { initialValue: [] },
  );
  private readonly incomeCategories = toSignal(
    this.store.select(selectByType('income')), { initialValue: [] },
  );
  readonly wallets = toSignal(this.store.select(selectAllWallets), { initialValue: [] });

  readonly filteredCategories = computed(() => {
    const type = this.form?.get('type')?.value;
    return type === 'income' ? this.incomeCategories() : this.expenseCategories();
  });

  ngOnInit(): void {
    const tx = this.transaction;
    this.form = this.fb.group({
      type:           [tx?.type ?? 'expense', Validators.required],
      amount:         [tx?.amount ?? null, [Validators.required, Validators.min(0.01)]],
      currency:       [tx?.currency ?? this.userBaseCurrency ?? 'EUR', Validators.required],
      walletId:       [tx?.walletId ?? '', Validators.required],
      categoryId:     [tx?.categoryId ?? '', Validators.required],
      concept:        [tx?.concept ?? ''],
      date:           [tx?.date ?? new Date().toISOString().split('T')[0], Validators.required],
      isRecurring:    [tx?.isRecurring ?? false],
      recurrenceRule: [tx?.recurrenceRule ?? null],
      notes:          [tx?.notes ?? ''],
    });
  }

  onConceptInput(prefix: string): void {
    const catId = this.form.get('categoryId')?.value;
    if (!catId) return;
    const suggestions = this.conceptsService.getSuggestions(
      catId,
      prefix,
      this.allConcepts(),
    );
    this.suggestions$.next(suggestions);
  }

  onConceptSelected(text: string): void {
    this.form.patchValue({ concept: text });
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const draft = {
      userId:         this.userId,
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

    if (this.transaction && this.rowNumber) {
      const updated: ITransaction = {
        ...this.transaction,
        ...draft,
        updatedAt: new Date().toISOString(),
      };
      // Si cambiaron amount/currency, el efecto recalcula amountBase
      this.store.dispatch(
        TransactionsActions.updateTransaction({
          transaction: updated,
          rowNumber: this.rowNumber,
          userBaseCurrency: this.userBaseCurrency,
        }),
      );
    } else {
      this.store.dispatch(
        TransactionsActions.addTransaction({ draft, userBaseCurrency: this.userBaseCurrency }),
      );
    }

    await this.modalCtrl.dismiss();
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}
