import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SpendingItem } from '@features/analytics/services/analytics.service';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-spending-ranking',
  standalone: true,
  imports: [CurrencyFormatPipe],
  templateUrl: './spending-ranking.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpendingRankingComponent {
  /** Lista de gastos recurrentes clasificados por analytics.service. Usado por analytics.page. */
  recurrentes  = input<SpendingItem[]>([]);
  /** Lista de gastos superfluos clasificados por analytics.service. Usado por analytics.page. */
  superfluos   = input<SpendingItem[]>([]);
  /** Moneda base del usuario para formatear montos. Recibida de analytics.page vía userBaseCurrency. */
  userCurrency = input<string>('EUR');
}
