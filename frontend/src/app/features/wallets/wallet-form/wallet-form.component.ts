import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonLabel, IonInput,
  IonToggle, IonNote, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronDownOutline } from 'ionicons/icons';
import { WalletsStateService } from '@core/state/wallets.state';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { IWallet } from '@models/wallet.model';
import { APP_COLORS } from '@core/constants/colors.constants';
import { COLOR_OPTIONS_WALLET } from '@core/constants/list-colors.constants';
import { ICON_OPTIONS_WALLET } from '@core/constants/list-icons.constants';

const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'ARS', 'BRL', 'MXN', 'CLP', 'COP'];

@Component({
  selector: 'app-wallet-form',
  templateUrl: 'wallet-form.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel, IonInput,
    IonToggle, IonNote, IonIcon,
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

  private readonly fb = inject(FormBuilder);
  private readonly walletsState = inject(WalletsStateService);
  private readonly workspacesState = inject(WorkspacesStateService);
  private readonly modalCtrl = inject(ModalController);

  form!: FormGroup;
  readonly currencies = SUPPORTED_CURRENCIES;
  readonly icons = ICON_OPTIONS_WALLET;
  readonly colors = COLOR_OPTIONS_WALLET;

  /** Controla la visibilidad del grid de iconos de cartera. */
  readonly showIconPicker = signal(false);
  /** Controla la visibilidad del accordion de divisa. Mutex con showIconPicker. */
  readonly showCurrencyPicker = signal(false);
  /** Activa el input inline para emoji personalizado. */
  readonly customIconMode = signal(false);
  /** Valor del emoji personalizado siendo ingresado. */
  readonly customIconValue = signal('');

  /** True cuando se recibió una cartera existente, indicando modo edición. */
  get isEditMode(): boolean { return !!this.wallet; }

  constructor() {
    addIcons({ chevronDownOutline });
  }

  ngOnInit(): void {
    const w = this.wallet;
    this.form = this.fb.group({
      name: [w?.name ?? '', [Validators.required, Validators.minLength(1)]],
      currency: [w?.currency ?? 'EUR', Validators.required],
      icon: [w?.icon ?? '💳', Validators.required],
      color: [w?.color ?? APP_COLORS.GREEN_BASE, Validators.required],
      isDefault: [w?.isDefault ?? false],
    });
  }

  onIconSelect(icon: string): void {
    this.form.patchValue({ icon });
    this.showIconPicker.set(false);
    this.customIconMode.set(false);
    this.customIconValue.set('');
  }

  toggleCurrencyPicker(): void {
    this.showCurrencyPicker.update(v => !v);
    if (this.showCurrencyPicker()) this.showIconPicker.set(false);
  }

  onCurrencySelect(currency: string): void {
    this.form.patchValue({ currency });
    this.showCurrencyPicker.set(false);
  }

  onCustomIconInput(event: Event): void {
    this.customIconValue.set((event.target as HTMLInputElement).value);
  }

  onCustomIconConfirm(): void {
    const emoji = this.customIconValue().trim();
    if (!emoji) return;
    this.onIconSelect(emoji);
  }

  onCustomIconCancel(): void {
    this.customIconMode.set(false);
    this.customIconValue.set('');
  }

  onColorSelect(color: string): void {
    this.form.patchValue({ color });
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const now = new Date().toISOString();

    if (this.wallet && this.rowNumber) {
      this.walletsState.update({ ...this.wallet, ...value }, this.rowNumber);
    } else {
      const newWallet: IWallet = {
        walletId: crypto.randomUUID(),
        userId: this.userId!,
        name: value.name.trim(),
        currency: value.currency,
        balance: 0,
        color: value.color,
        icon: value.icon,
        isDefault: value.isDefault,
        workspaceId: this.workspacesState.activeWorkspaceId(),
        createdAt: now,
      };
      this.walletsState.add(newWallet);
    }
    await this.modalCtrl.dismiss();
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}
