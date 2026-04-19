import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { 
  IonContent, 
  IonItem, 
  IonInput, 
  IonIcon, 
  IonButton,
  LoadingController,
  ToastController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline, walletOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonContent, IonItem, IonInput, IonIcon, IonButton, FormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly toastCtrl = inject(ToastController);

  email = '';
  password = '';

  constructor() {
    addIcons({ mailOutline, lockClosedOutline, walletOutline });
  }

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
    }
  }

  async handleLogin(): Promise<void> {
    if (!this.email || !this.password) {
      this.showToast('Por favor, rellena todos los campos');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Iniciando sesión...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const success = await this.authService.login(this.email, this.password);
      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.showToast('Credenciales incorrectas');
      }
    } catch (error) {
      console.error('[LoginPage] Error login:', error);
      this.showToast('Error al conectar con el servidor');
    } finally {
      loading.dismiss();
    }
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }
}
