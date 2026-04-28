import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { AuthService } from '@core/services/auth.service';
import { addIcons } from 'ionicons';
import {
  homeOutline,
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
export class TabsPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    addIcons({
      homeOutline,
      barChartOutline,
      ellipsisHorizontalOutline,
    });
  }

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }
}
