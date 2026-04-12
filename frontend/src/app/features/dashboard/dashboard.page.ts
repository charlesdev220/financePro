import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon],
})
export class DashboardPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);

  constructor() {
    addIcons({ logOutOutline });
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
