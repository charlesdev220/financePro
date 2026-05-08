import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { rocketOutline, sparklesOutline } from 'ionicons/icons';

@Component({
  selector: 'app-dashboard-onboarding',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonIcon, IonSpinner],
  templateUrl: './dashboard-onboarding.component.html',
})
export class DashboardOnboardingComponent {
  /** Utilizado por DashboardPage para deshabilitar el botón mientras se inicializa la cuenta. */
  isSeeding = input.required<boolean>();
  /** Emitido por DashboardPage para lanzar el proceso de seed. */
  seed = output<void>();

  constructor() {
    addIcons({ rocketOutline, sparklesOutline });
  }

  onSeed(): void {
    this.seed.emit();
  }
}
