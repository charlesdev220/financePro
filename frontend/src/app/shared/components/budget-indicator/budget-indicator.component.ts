import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonProgressBar, IonNote } from '@ionic/angular/standalone';
import { IBudget } from '@models/budget.model';
import { BUDGET_STATUS } from '@core/constants/budget.constants';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-budget-indicator',
  standalone: true,
  imports: [IonProgressBar, IonNote, CurrencyFormatPipe],
  templateUrl: './budget-indicator.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetIndicatorComponent {
  /** Presupuesto a visualizar — progress bar + montos gastado/total. Usado por budget-list y transaction-form. */
  budget = input.required<IBudget>();
  /** Moneda del usuario para formatear los montos del presupuesto. Recibida del componente padre. */
  userCurrency = input<string>('EUR');

  /** Porcentaje de gasto sobre el presupuesto asignado, limitado a 100. */
  readonly percentage = computed(() =>
    Math.min(100, Math.round((this.budget().spentAmount / this.budget().budgetAmount) * 100)),
  );

  /** Color Ionic del progress bar según el estado del presupuesto. */
  readonly color = computed(() => {
    const s = this.budget().status;
    return s === BUDGET_STATUS.OK ? 'success' : s === BUDGET_STATUS.WARNING ? 'warning' : 'danger';
  });
}
