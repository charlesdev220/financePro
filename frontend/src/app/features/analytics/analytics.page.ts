import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { TransactionsStateService } from '@core/state/transactions.state';
import { CategoriesStateService } from '@core/state/categories.state';
import { CurrencyStateService } from '@core/state/currency.state';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsChartComponent } from './components/analytics-chart/analytics-chart.component';
import { CategorySpendingChartComponent } from './components/category-spending-chart/category-spending-chart.component';
import { ProjectionsComponent } from './components/projections/projections.component';
import { SpendingRankingComponent } from './components/spending-ranking/spending-ranking.component';
import { PeriodSelectorComponent } from '@shared/components/period-selector/period-selector.component';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';

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
    CategorySpendingChartComponent,
    ProjectionsComponent,
    SpendingRankingComponent,
    CurrencyFormatPipe,
  ],
})
export class AnalyticsPage implements OnInit {
  private readonly txState          = inject(TransactionsStateService);
  private readonly categoriesState  = inject(CategoriesStateService);
  private readonly currencyState    = inject(CurrencyStateService);
  private readonly analyticsService = inject(AnalyticsService);

  /** Todas las transacciones del usuario para calcular totales y clasificaciones. */
  readonly allTxs = this.txState.items;

  /** Moneda base del usuario. Fallback 'EUR' antes de cargar. */
  readonly userBaseCurrency = computed(() => this.currencyState.baseCurrency() ?? 'EUR');

  /** Categorías activas del usuario para el análisis de gastos. */
  readonly categories = this.categoriesState.items;

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

  /** Totales del último período disponible para el header de resumen. */
  readonly currentPeriodSummary = computed(() => {
    const totals = this.monthlyTotals();
    if (!totals.length) return { income: 0, expense: 0, balance: 0 };
    const last = totals[totals.length - 1];
    return { income: last.income, expense: last.expense, balance: last.income - last.expense };
  });

  /** Clasificación de gastos recurrentes vs superfluos del período seleccionado. */
  readonly spendingData = computed(() =>
    this.analyticsService.classifySpending(this.filteredTxs(), this.periods()),
  );

  /** Gasto acumulado por categoría para el período filtrado, ordenado DESC. */
  readonly categorySpending = computed(() =>
    this.analyticsService.getCategorySpending(this.filteredTxs(), this.categories()),
  );

  ngOnInit(): void {
    this.txState.load();
    this.categoriesState.load();
  }

  onPeriodChange(period: string): void {
    this.startPeriod.set(period);
  }
}
