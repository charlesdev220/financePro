import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IBudget } from '@models/budget.model';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-budget-indicator',
  standalone: true,
  imports: [CurrencyFormatPipe],
  templateUrl: './budget-indicator.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetIndicatorComponent {
  /** Presupuesto a visualizar — progress bar + montos gastado/total. Usado por budget-list y transaction-form. */
  budget = input.required<IBudget>();
  /** Moneda del usuario para formatear los montos del presupuesto. Recibida del componente padre. */
  userCurrency = input<string>('EUR');
  /** Color hex de la categoría del presupuesto. Define el color de la barra cuando pct < 80%. */
  catColor = input<string>('#5BAD8F');

  /** Porcentaje de gasto sobre el presupuesto asignado, limitado a [0, 100]. */
  readonly pct = computed(() => {
    const b = this.budget();
    if (!b.budgetAmount) return 0;
    const raw = (b.spentAmount / b.budgetAmount) * 100;
    return isNaN(raw) || !isFinite(raw) ? 0 : Math.min(100, Math.round(raw));
  });

  /** Color de la barra: rojo si >= 80% (igual que dashboard), color de categoría si no. */
  readonly barColor = computed(() => this.pct() >= 80 ? '#E57373' : this.catColor());
}
