import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { selectAllTransactions } from '../../store/transactions/transactions.selectors';
import { selectActiveCategories } from '../../store/categories/categories.selectors';
import { TransactionsActions } from '../../store/transactions/transactions.actions';
import { CategoriesActions } from '../../store/categories/categories.actions';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsChartComponent } from './components/analytics-chart/analytics-chart.component';
import { ProjectionsComponent } from './components/projections/projections.component';
import { SpendingRankingComponent } from './components/spending-ranking/spending-ranking.component';
import { PeriodSelectorComponent } from '../../shared/components/period-selector/period-selector.component';

function sixMonthsAgo(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 5);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-analytics',
  templateUrl: 'analytics.page.html',
  styleUrls: ['analytics.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    PeriodSelectorComponent,
    AnalyticsChartComponent,
    ProjectionsComponent,
    SpendingRankingComponent,
  ],
})
export class AnalyticsPage implements OnInit {
  private readonly store           = inject(Store);
  private readonly analyticsService = inject(AnalyticsService);

  readonly allTxs     = toSignal(this.store.select(selectAllTransactions),  { initialValue: [] });
  readonly categories = toSignal(this.store.select(selectActiveCategories), { initialValue: [] });

  readonly startPeriod      = signal<string>(sixMonthsAgo());
  readonly selectedCategory = signal<string | null>(null);

  readonly filteredTxs = computed(() =>
    this.allTxs().filter(tx => tx.date.slice(0, 7) >= this.startPeriod()),
  );

  readonly monthlyTotals = computed(() =>
    this.analyticsService.getMonthlyTotals(this.filteredTxs(), 6),
  );

  readonly periods = computed(() => this.monthlyTotals().map(t => t.period));

  readonly spendingData = computed(() =>
    this.analyticsService.classifySpending(this.filteredTxs(), this.periods()),
  );

  ngOnInit(): void {
    this.store.dispatch(TransactionsActions.loadTransactions());
    this.store.dispatch(CategoriesActions.loadCategories());
  }

  onPeriodChange(period: string): void {
    this.startPeriod.set(period);
  }
}
