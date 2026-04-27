import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonNote,
  IonInput,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { logOutOutline, personCircleOutline, cashOutline, walletOutline } from 'ionicons/icons';
import { AuthService } from '@core/services/auth.service';
import { UserSettingsStateService } from '@core/state/user-settings.state';
import { CurrencyStateService } from '@core/state/currency.state';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonIcon, IonNote, IonInput],
})
export class SettingsPage implements OnInit {
  private readonly authService     = inject(AuthService);
  private readonly router          = inject(Router);
  private readonly alertCtrl       = inject(AlertController);
  private readonly toastCtrl       = inject(ToastController);
  private readonly userSettingsState = inject(UserSettingsStateService);
  private readonly currencyState     = inject(CurrencyStateService);

  readonly user             = this.authService.getUser();
  /** Presupuesto mensual por defecto para nuevas categorías de gasto. */
  readonly defaultBudget    = this.userSettingsState.defaultCategoryBudget;
  /** Moneda base del usuario para mostrar junto al campo de presupuesto. */
  readonly baseCurrency     = this.currencyState.baseCurrency;

  constructor() {
    addIcons({ logOutOutline, personCircleOutline, cashOutline, walletOutline });
  }

  ngOnInit(): void {
    this.userSettingsState.load();
    this.currencyState.load();
  }

  onDefaultBudgetChange(event: CustomEvent): void {
    const val = Number(event.detail.value);
    if (isNaN(val) || val <= 0) return;
    this.userSettingsState.saveDefaultBudget(val);
  }

  async handleSignOut(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro que querés cerrar la sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar sesión',
          role: 'destructive',
          handler: () => {
            this.authService.signOut();
            this.router.navigate(['/login'], { replaceUrl: true });
          },
        },
      ],
    });
    await alert.present();
  }
}
