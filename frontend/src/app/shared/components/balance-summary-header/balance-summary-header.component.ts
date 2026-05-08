import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-balance-summary-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyFormatPipe],
  templateUrl: './balance-summary-header.component.html',
})
export class BalanceSummaryHeaderComponent {
  /** Balance neto del período a mostrar en la pill central. */
  balance = input.required<number>();
  /** Total de ingresos del período. */
  income = input.required<number>();
  /** Total de gastos del período. */
  expense = input.required<number>();
  /** Código de moneda base del usuario (ej. 'EUR'). */
  currency = input.required<string>();
}
