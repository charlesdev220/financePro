import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IonProgressBar, IonNote } from '@ionic/angular/standalone';
import { IBudget } from '../../../models/budget.model';

@Component({
  selector: 'app-budget-indicator',
  standalone: true,
  imports: [IonProgressBar, IonNote, DecimalPipe],
  templateUrl: './budget-indicator.component.html',
  styleUrls: ['./budget-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetIndicatorComponent {
  @Input({ required: true }) budget!: IBudget;

  get percentage(): number {
    return Math.min(100, Math.round((this.budget.spentAmount / this.budget.budgetAmount) * 100));
  }

  get color(): string {
    return this.budget.status === 'ok'
      ? 'success'
      : this.budget.status === 'warning'
        ? 'warning'
        : 'danger';
  }
}
