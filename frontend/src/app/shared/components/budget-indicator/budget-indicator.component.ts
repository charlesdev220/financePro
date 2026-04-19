import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IonProgressBar, IonNote } from '@ionic/angular/standalone';
import { IBudget } from '../../../models/budget.model';
import { BUDGET_STATUS } from '../../../core/constants/budget.constants';

@Component({
  selector: 'app-budget-indicator',
  standalone: true,
  imports: [IonProgressBar, IonNote, DecimalPipe],
  templateUrl: './budget-indicator.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetIndicatorComponent {
  budget = input.required<IBudget>();

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
