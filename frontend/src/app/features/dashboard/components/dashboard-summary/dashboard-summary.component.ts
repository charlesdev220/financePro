import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol } from '@ionic/angular/standalone';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { DashboardSummary } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard-summary',
  templateUrl: 'dashboard-summary.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol, CurrencyFormatPipe],
})
export class DashboardSummaryComponent {
  @Input({ required: true }) summary!: DashboardSummary;

  get balanceIsNegative(): boolean {
    return this.summary.balance < 0;
  }
}
