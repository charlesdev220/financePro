import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonList, IonItem, IonLabel, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { layersOutline, walletOutline, settingsOutline, pieChartOutline, swapHorizontalOutline } from 'ionicons/icons';

@Component({
  selector: 'app-more',
  templateUrl: 'more.page.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonList, IonItem, IonLabel, IonIcon,
    RouterLink,
  ],
})
export class MorePage {
  constructor() {
    addIcons({ layersOutline, walletOutline, settingsOutline, pieChartOutline, swapHorizontalOutline });
  }
}
