import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { SpendingItem } from '../../services/analytics.service';

@Component({
  selector: 'app-spending-ranking',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './spending-ranking.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpendingRankingComponent {
  recurrentes = input<SpendingItem[]>([]);
  superfluos  = input<SpendingItem[]>([]);
}
