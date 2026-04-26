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
import { mailOutline, lockClosedOutline, personOutline, walletOutline, arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [IonContent, IonItem, IonInput, IonIcon, IonButton, FormsModule, RouterLink],
  templateUrl: './register.page.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly toastCtrl = inject(ToastController);

  name = '';
  email = '';
  password = '';

  constructor() {
    addIcons({ mailOutline, lockClosedOutline, personOutline, walletOutline, arrowBackOutline });
  }

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
    }
  }

  async handleRegister(): Promise<void> {
    if (!this.name || !this.email || !this.password) {
      this.showToast('Por favor, rellena todos los campos');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Creando cuenta...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const success = await this.authService.register({
        name: this.name,
        email: this.email,
        password: this.password
      });

      if (success) {
        this.showToast('¡Cuenta creada con éxito!', 'success');
        this.router.navigate(['/dashboard']);
      } else {
        this.showToast('Error al crear la cuenta. Inténtalo de nuevo.');
      }
    } catch (error) {
      this.showToast('Error de conexión con el servidor');
    } finally {
      loading.dismiss();
    }
  }

  private async showToast(message: string, color: string = 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
