import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonInput,
  IonSpinner,
  IonBadge,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { refreshOutline, createOutline, checkmarkOutline, closeOutline, starOutline, starSharp, addOutline, cashOutline } from 'ionicons/icons';
import { map } from 'rxjs';
import { CurrencyActions } from '@store/currency/currency.actions';
import { selectAllCurrencies, selectBaseCurrency, selectCurrenciesLoading, selectCurrencyState } from '@store/currency/currency.selectors';
import { ICurrency } from '@models/currency.model';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

const ISO_CURRENCIES: { code: string; name: string }[] = [
  { code: 'USD', name: 'Dólar estadounidense' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'Libra esterlina' },
  { code: 'JPY', name: 'Yen japonés' },
  { code: 'AUD', name: 'Dólar australiano' },
  { code: 'CAD', name: 'Dólar canadiense' },
  { code: 'CHF', name: 'Franco suizo' },
  { code: 'CNY', name: 'Yuan chino' },
  { code: 'SEK', name: 'Corona sueca' },
  { code: 'NZD', name: 'Dólar neozelandés' },
  { code: 'MXN', name: 'Peso mexicano' },
  { code: 'SGD', name: 'Dólar de Singapur' },
  { code: 'HKD', name: 'Dólar de Hong Kong' },
  { code: 'NOK', name: 'Corona noruega' },
  { code: 'KRW', name: 'Won surcoreano' },
  { code: 'TRY', name: 'Lira turca' },
  { code: 'INR', name: 'Rupia india' },
  { code: 'RUB', name: 'Rublo ruso' },
  { code: 'BRL', name: 'Real brasileño' },
  { code: 'ZAR', name: 'Rand sudafricano' },
  { code: 'DKK', name: 'Corona danesa' },
  { code: 'PLN', name: 'Esloti polaco' },
  { code: 'THB', name: 'Baht tailandés' },
  { code: 'IDR', name: 'Rupia indonesia' },
  { code: 'HUF', name: 'Forinto húngaro' },
  { code: 'CZK', name: 'Corona checa' },
  { code: 'ILS', name: 'Nuevo séquel israelí' },
  { code: 'CLP', name: 'Peso chileno' },
  { code: 'PHP', name: 'Peso filipino' },
  { code: 'AED', name: 'Dírham de EAU' },
  { code: 'COP', name: 'Peso colombiano' },
  { code: 'SAR', name: 'Riyal saudí' },
  { code: 'MYR', name: 'Ringgit malayo' },
  { code: 'RON', name: 'Leu rumano' },
  { code: 'ARS', name: 'Peso argentino' },
  { code: 'PEN', name: 'Sol peruano' },
  { code: 'VND', name: 'Dong vietnamita' },
  { code: 'EGP', name: 'Libra egipcia' },
  { code: 'NGN', name: 'Naira nigeriana' },
  { code: 'PKR', name: 'Rupia pakistaní' },
  { code: 'UAH', name: 'Grivna ucraniana' },
  { code: 'KWD', name: 'Dinar kuwaití' },
  { code: 'QAR', name: 'Riyal catarí' },
  { code: 'TWD', name: 'Nuevo dólar taiwanés' },
  { code: 'UYU', name: 'Peso uruguayo' },
  { code: 'BOB', name: 'Boliviano' },
  { code: 'PYG', name: 'Guaraní paraguayo' },
  { code: 'GTQ', name: 'Quetzal guatemalteco' },
  { code: 'HNL', name: 'Lempira hondureño' },
  { code: 'DOP', name: 'Peso dominicano' },
];

@Component({
  selector: 'app-currency-settings',
  templateUrl: './currency-settings.page.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, DecimalPipe, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton,
    IonItem, IonLabel,
    IonIcon, IonButton, IonInput, IonSpinner, IonBadge,
  ],
})
export class CurrencySettingsPage implements OnInit {
  private readonly store = inject(Store);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);

  /** Lista de divisas persistidas en Sheets para este usuario. */
  readonly currencies = toSignal(this.store.select(selectAllCurrencies), { initialValue: [] });
  /** Código de la moneda base del usuario desde USER_SETTINGS. */
  readonly baseCurrency = toSignal(this.store.select(selectBaseCurrency), { initialValue: 'EUR' });
  /** Estado de carga del slice currency — controla spinners y botones. */
  readonly loading = toSignal(this.store.select(selectCurrenciesLoading), { initialValue: false });
  /** Error del slice currency — dispara toast cuando llega un nuevo mensaje. */
  private readonly currencyError = toSignal(
    this.store.select(selectCurrencyState).pipe(map(s => s.error)),
    { initialValue: null as string | null }
  );

  readonly searchQuery = signal<string>('');
  readonly editingCode = signal<string | null>(null);
  readonly editingRate = signal<number>(0);

  readonly isoCurrencies = ISO_CURRENCIES;

  constructor() {
    addIcons({ refreshOutline, createOutline, checkmarkOutline, closeOutline, starOutline, starSharp, addOutline, cashOutline });
    effect(() => {
      const err = this.currencyError();
      if (err) this.showErrorToast(err);
    });
  }

  ngOnInit(): void {
    this.store.dispatch(CurrencyActions.loadCurrencies());
  }

  private async showErrorToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
    });
    await toast.present();
  }

  get filteredIsoCurrencies(): { code: string; name: string }[] {
    const q = this.searchQuery().toLowerCase();
    if (!q) return [];
    return this.isoCurrencies.filter(
      c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }

  onRefresh(code: string): void {
    const base = this.baseCurrency() ?? 'EUR';
    this.store.dispatch(CurrencyActions.fetchAndPersistRate({ from: code, to: base }));
  }

  onStartEdit(currency: ICurrency): void {
    this.editingCode.set(currency.currencyCode);
    this.editingRate.set(currency.rateToBase);
  }

  onSaveEdit(): void {
    const code = this.editingCode();
    const rate = this.editingRate();
    if (!code || rate <= 0) return;
    const existing = this.currencies().find(c => c.currencyCode === code);
    if (!existing) return;
    const updated: ICurrency = {
      ...existing,
      rateToBase: rate,
      lastUpdated: new Date().toISOString(),
      source: 'manual',
    };
    this.store.dispatch(CurrencyActions.saveCurrency({ currency: updated }));
    this.editingCode.set(null);
  }

  onCancelEdit(): void {
    this.editingCode.set(null);
  }

  onSetBase(code: string): void {
    this.store.dispatch(CurrencyActions.setBaseCurrency({ currencyCode: code }));
  }

  onRateInput(event: CustomEvent): void {
    this.editingRate.set(Number(event.detail.value ?? 0));
  }

  onSearchInput(event: CustomEvent): void {
    this.searchQuery.set(String(event.detail.value ?? ''));
  }

  onFocusSearch(): void {
    this.searchQuery.set('');
    const input = document.querySelector('ion-input') as HTMLIonInputElement | null;
    input?.setFocus();
  }

  async onAddCurrency(code: string, name: string): Promise<void> {
    const already = this.currencies().some(c => c.currencyCode === code);
    if (already) {
      const toast = await this.toastCtrl.create({
        message: `${code} ya está en tu lista.`,
        duration: 2000,
        position: 'bottom',
        color: 'warning',
      });
      await toast.present();
      return;
    }
    this.searchQuery.set('');
    const base = this.baseCurrency() ?? 'EUR';
    this.store.dispatch(CurrencyActions.fetchAndPersistRate({ from: code, to: base }));
  }
}
