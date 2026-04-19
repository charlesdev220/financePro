import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { SpendingItem } from '../../services/analytics.service';

@Component({
  selector: 'app-spending-ranking',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './spending-ranking.component.html',
  styleUrls: ['./spending-ranking.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpendingRankingComponent {
  @Input() recurrentes: SpendingItem[] = [];
  @Input() superfluos: SpendingItem[]  = [];
}
