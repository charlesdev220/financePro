import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, settingsOutline } from 'ionicons/icons';
import { AuthService } from '@core/services/auth.service';
import { WorkspacesStateService } from '@core/state/workspaces.state';

@Component({
  selector: 'app-share-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
  ],
  templateUrl: './share-header.component.html',
})
export class ShareHeaderComponent {
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly authService = inject(AuthService);
  readonly workspacesState = inject(WorkspacesStateService);

  /** Workspace activo para mostrar en el selector del header. */
  readonly activeWorkspace = computed(() => {
    const id = this.workspacesState.activeWorkspaceId();
    return this.workspacesState.items().find(w => w.workspaceId === id) ?? null;
  });

  constructor() {
    addIcons({ logOutOutline, settingsOutline });
  }

  openSettings(): void {
    this.router.navigate(['/tabs/settings']);
  }

  onWorkspaceChange(event: CustomEvent): void {
    this.workspacesState.setActive(event.detail.value);
  }

  async confirmLogout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro de que querés salir?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Salir', role: 'destructive', handler: () => this.authService.signOut() },
      ],
    });
    await alert.present();
  }
}
