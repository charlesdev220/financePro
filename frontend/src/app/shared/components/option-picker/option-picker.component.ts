import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

export interface PickerItem {
  value: string;
  label: string;
  sublabel?: string;
  icon?: string;
  color?: string;
}

/**
 * Picker bottom-sheet reutilizable para seleccionar una opción de una lista.
 * Abre como ion-modal con breakpoints — soporta tres modos visuales:
 *   'tiles'  → grid 4-col con borde de color (categorías)
 *   'cards'  → grid 2-col con icono + nombre (carteras)
 *   'pills'  → fila de pastillas de texto (divisas, períodos)
 *
 * Excepción arquitectónica: @Input() en lugar de input() signal-based.
 * Motivo: componentProps de ModalController asigna props directamente sin Angular signals.
 */
@Component({
  selector: 'app-option-picker',
  templateUrl: 'option-picker.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonIcon,
  ],
})
export class OptionPickerComponent {
  @Input() title = 'Seleccioná';
  @Input() items: PickerItem[] = [];
  @Input() selectedValue = '';
  @Input() mode: 'tiles' | 'cards' | 'pills' = 'pills';

  private readonly modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ closeOutline });
  }

  select(value: string): void {
    this.modalCtrl.dismiss({ value }, 'confirm');
  }

  dismiss(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
