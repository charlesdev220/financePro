import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { selectAllTransactions } from '@store/transactions/transactions.selectors';
import { selectActiveCategories } from '@store/categories/categories.selectors';
import { map } from 'rxjs';
import { selectBaseCurrency } from '@store/currency/currency.selectors';
import { ITransaction } from '@models/transaction.model';
import { TransactionsActions } from '@store/transactions/transactions.actions';
import { CategoriesActions } from '@store/categories/categories.actions';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsChartComponent } from './components/analytics-chart/analytics-chart.component';
import { ProjectionsComponent } from './components/projections/projections.component';
import { SpendingRankingComponent } from './components/spending-ranking/spending-ranking.component';
import { PeriodSelectorComponent } from '@shared/components/period-selector/period-selector.component';

function sixMonthsAgo(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 5);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-analytics',
  templateUrl: 'analytics.page.html',
  styleUrls: [],
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

  /** Todas las transacciones del usuario para calcular totales y clasificaciones. */
  readonly allTxs = toSignal(this.store.select(selectAllTransactions), { initialValue: [] as ITransaction[] });

  /** Moneda base del usuario desde USER_SETTINGS via NgRx. Fallback 'EUR' antes de cargar. */
  readonly userBaseCurrency = toSignal(
    this.store.select(selectBaseCurrency).pipe(map(c => c ?? 'EUR')),
    { initialValue: 'EUR' }
  );
  /** Categorías activas del usuario para el análisis de gastos. */
  readonly categories = toSignal(this.store.select(selectActiveCategories), { initialValue: [] });

  readonly startPeriod      = signal<string>(sixMonthsAgo());
  readonly selectedCategory = signal<string | null>(null);

  /** Transacciones a partir del período de inicio seleccionado, para el análisis. */
  readonly filteredTxs = computed(() =>
    this.allTxs().filter(tx => tx.date.slice(0, 7) >= this.startPeriod()),
  );

  /** Totales mensuales (ingresos + gastos) de los últimos 6 meses filtrados. */
  readonly monthlyTotals = computed(() =>
    this.analyticsService.getMonthlyTotals(this.filteredTxs(), 6),
  );

  /** Períodos disponibles derivados de los totales mensuales, para el selector. */
  readonly periods = computed(() => this.monthlyTotals().map(t => t.period));

  /** Clasificación de gastos recurrentes vs superfluos del período seleccionado. */
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
