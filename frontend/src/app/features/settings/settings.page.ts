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
  IonListHeader,
  IonItem,
  IonLabel,
  IonIcon,
  IonNote,
  IonInput,
  IonButton,
  AlertController,
  ToastController,
  ModalController,
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { logOutOutline, personCircleOutline, cashOutline, walletOutline } from 'ionicons/icons';
import { AuthService } from '@core/services/auth.service';
import { UserSettingsStateService } from '@core/state/user-settings.state';
import { CurrencyStateService } from '@core/state/currency.state';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { WorkspaceFormComponent } from '@features/workspaces/workspace-form/workspace-form.component';
import { IWorkspace } from '@models/workspace.model';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonList, IonListHeader, IonItem, IonLabel, IonIcon, IonNote, IonInput, IonButton],
})
export class SettingsPage implements OnInit {
  private readonly authService     = inject(AuthService);
  private readonly router          = inject(Router);
  private readonly alertCtrl       = inject(AlertController);
  private readonly toastCtrl       = inject(ToastController);
  private readonly modalCtrl       = inject(ModalController);
  private readonly userSettingsState = inject(UserSettingsStateService);
  private readonly currencyState     = inject(CurrencyStateService);
  readonly workspacesState           = inject(WorkspacesStateService);

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
    this.workspacesState.load();
  }

  async openWorkspaceForm(ws?: IWorkspace, rowNumber?: number): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: WorkspaceFormComponent,
      componentProps: { workspace: ws, rowNumber },
      breakpoints: [0, 0.75],
      initialBreakpoint: 0.75,
    });
    await modal.present();
  }

  async confirmDeleteWorkspace(ws: IWorkspace, rowNumber: number): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar espacio',
      message: 'Eliminando este espacio perderás acceso a sus datos en esta vista.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.workspacesState.delete(ws.workspaceId, rowNumber),
        },
      ],
    });
    await alert.present();
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
