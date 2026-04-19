import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  swapHorizontalOutline,
  pieChartOutline,
  barChartOutline,
  ellipsisHorizontalOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  constructor() {
    addIcons({
      homeOutline,
      swapHorizontalOutline,
      pieChartOutline,
      barChartOutline,
      ellipsisHorizontalOutline,
    });
  }
}
