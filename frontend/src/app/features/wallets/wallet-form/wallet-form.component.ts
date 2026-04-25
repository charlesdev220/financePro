import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ModalController } from '@ionic/angular/standalone';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonToggle, IonNote, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronDownOutline } from 'ionicons/icons';
import { WalletsActions } from '@store/wallets/wallets.actions';
import { IWallet } from '@models/wallet.model';

const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'ARS', 'BRL', 'MXN', 'CLP', 'COP'];
const ICON_OPTIONS = ['💳','🏦','💰','💵','🏧','👝','💼','🏠','🚗','✈️','💎','🪙'];
const COLOR_OPTIONS = ['#4CAF50','#2196F3','#9C27B0','#FF9800','#F44336','#009688','#FF5722','#607D8B'];

@Component({
  selector: 'app-wallet-form',
  templateUrl: 'wallet-form.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonToggle, IonNote, IonIcon,
  ],
})
export class WalletFormComponent implements OnInit {
  /**
   * Excepción arquitectónica: se usa @Input() legacy en lugar de input() signal-based.
   * Motivo: Ionic ModalController.create({ componentProps }) asigna props directamente
   * sobre la instancia (component.wallet = value), sin pasar por Angular signals.
   * Usar input<T>() provoca "TypeError: this.wallet is not a function" en runtime.
   */
  @Input() wallet?: IWallet;
  /** @see wallet — misma excepción. */
  @Input() userId?: string;
  /** @see wallet — misma excepción. */
  @Input() rowNumber?: number;

  private readonly fb        = inject(FormBuilder);
  private readonly store     = inject(Store);
  private readonly modalCtrl = inject(ModalController);

  form!: FormGroup;
  readonly currencies = SUPPORTED_CURRENCIES;
  readonly icons      = ICON_OPTIONS;
  readonly colors     = COLOR_OPTIONS;

  /** Controla la visibilidad del grid de iconos de cartera. */
  readonly showIconPicker = signal(false);

  /** True cuando se recibió una cartera existente, indicando modo edición. */
  get isEditMode(): boolean { return !!this.wallet; }

  constructor() {
    addIcons({ chevronDownOutline });
  }

  ngOnInit(): void {
    const w = this.wallet;
    this.form = this.fb.group({
      name:      [w?.name ?? '', [Validators.required, Validators.minLength(1)]],
      currency:  [w?.currency ?? 'EUR', Validators.required],
      icon:      [w?.icon ?? '💳', Validators.required],
      color:     [w?.color ?? '#4CAF50', Validators.required],
      isDefault: [w?.isDefault ?? false],
    });
  }

  onIconSelect(icon: string): void {
    this.form.patchValue({ icon });
    this.showIconPicker.set(false);
  }

  onColorSelect(color: string): void {
    this.form.patchValue({ color });
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const now   = new Date().toISOString();

    if (this.wallet && this.rowNumber) {
      this.store.dispatch(WalletsActions.updateWallet({
        wallet: { ...this.wallet, ...value },
        rowNumber: this.rowNumber,
      }));
    } else {
      const newWallet: IWallet = {
        walletId:  crypto.randomUUID(),
        userId:    this.userId!,
        name:      value.name.trim(),
        currency:  value.currency,
        balance:   0,
        color:     value.color,
        icon:      value.icon,
        isDefault: value.isDefault,
        createdAt: now,
      };
      this.store.dispatch(WalletsActions.addWallet({ wallet: newWallet }));
    }
    await this.modalCtrl.dismiss();
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}
