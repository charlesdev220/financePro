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
import { UserSettingsStateService } from '@core/state/user-settings.state';
import { PeriodService } from '@core/services/period.service';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsChartComponent } from './components/analytics-chart/analytics-chart.component';
import { CategorySpendingChartComponent } from './components/category-spending-chart/category-spending-chart.component';
import { ProjectionsComponent } from './components/projections/projections.component';
import { SpendingRankingComponent } from './components/spending-ranking/spending-ranking.component';
import { SavingsChartComponent } from './components/savings-chart/savings-chart.component';
import { BalanceSummaryHeaderComponent } from '@shared/components/balance-summary-header/balance-summary-header.component';
import { PeriodNavigatorComponent, PeriodNavigatorState } from '@shared/components/period-navigator/period-navigator.component';

@Component({
  selector: 'app-analytics',
  templateUrl: 'analytics.page.html',
  styleUrls: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    BalanceSummaryHeaderComponent,
    PeriodNavigatorComponent,
    AnalyticsChartComponent,
    CategorySpendingChartComponent,
    ProjectionsComponent,
    SpendingRankingComponent,
    SavingsChartComponent,
  ],
})
export class AnalyticsPage implements OnInit {
  private readonly txState          = inject(TransactionsStateService);
  private readonly categoriesState  = inject(CategoriesStateService);
  private readonly currencyState    = inject(CurrencyStateService);
  private readonly userSettingsState = inject(UserSettingsStateService);
  private readonly periodService    = inject(PeriodService);
  private readonly analyticsService = inject(AnalyticsService);

  readonly allTxs        = this.txState.items;
  readonly categories    = this.categoriesState.items;
  readonly userBaseCurrency = computed(() => this.currencyState.baseCurrency() ?? 'EUR');

  /** Estado completo del navegador de período — emitido por app-period-navigator. */
  readonly periodState = signal<PeriodNavigatorState>({
    tab: 'month',
    offset: 0,
    isCustomRange: false,
    dateRange: this.periodService.getDateRange('month', new Date(), this.userSettingsState.monthStartDay(), 0),
  });

  // ── Fuentes de datos base ────────────────────────────────────────────────────

  /** Transacciones dentro del rango del período activo. El rango respeta monthStartDay via PeriodService. */
  readonly filteredTxs = computed(() => {
    const { from, to } = this.periodState().dateRange;
    if (!from || !to) return [];
    return this.allTxs().filter(tx => tx.date >= from && tx.date <= to);
  });

  /** Transacciones de períodos ya cerrados (mes anterior al actual). Fuente para proyecciones. */
  private readonly completedTxs = computed(() => {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    return this.allTxs().filter(tx => tx.date.slice(0, 7) < currentPeriod);
  });

  /** Año seleccionado en la navegación. Fuente única para todos los cómputos anuales. */
  private readonly selectedYear = computed(() =>
    new Date().getFullYear() + this.periodState().offset
  );

  /**
   * Fuente única para todos los gráficos en tab "Año".
   * getYearMonthlyTotals recibe filteredTxs() cuyo rango ya respeta monthStartDay
   * (PeriodService._yearRange incluye el fragmento de diciembre del año anterior).
   * Garantiza 12 períodos con ceros donde no hay datos.
   */
  private readonly yearMonthlyData = computed(() => {
    const { tab, isCustomRange } = this.periodState();
    if (tab !== 'year' || isCustomRange) return [];
    return this.analyticsService.getYearMonthlyTotals(
      this.filteredTxs(),
      this.selectedYear(),
      this.userSettingsState.monthStartDay(),
    );
  });

  // ── Computed para los gráficos ───────────────────────────────────────────────

  /**
   * Totales para el gráfico de barras Ingresos vs Gastos.
   * - Tab "Mes":  comparación inter-anual del mismo mes en años anteriores.
   * - Tab "Año":  yearMonthlyData() — fuente única del año.
   * - Resto:      períodos del rango activo respetando monthStartDay.
   */
  readonly chartTotals = computed(() => {
    const { tab, isCustomRange, dateRange } = this.periodState();
    const msd = this.userSettingsState.monthStartDay();

    if (tab === 'month' && !isCustomRange) {
      const endMonth = parseInt(dateRange.to.slice(5, 7), 10);
      return this.analyticsService.getSameMonthAcrossYears(this.allTxs(), endMonth, msd);
    }
    if (tab === 'year') {
      return this.yearMonthlyData();
    }
    return this.analyticsService.getMonthlyTotals(this.filteredTxs(), tab === 'week' ? 6 : 4, msd);
  });

  /**
   * Proyección de tendencia a corto plazo.
   * - Tab "Año": yearMonthlyData() filtrado a períodos completados.
   * - Resto:     últimos 4 períodos completados.
   */
  readonly projectionData = computed(() => {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const { tab, isCustomRange } = this.periodState();

    if (tab === 'year' && !isCustomRange) {
      return this.yearMonthlyData().filter(t => t.period < currentPeriod);
    }
    return this.analyticsService.getMonthlyTotals(
      this.completedTxs(),
      4,
      this.userSettingsState.monthStartDay(),
    );
  });

  /** Todo el historial de períodos completados — proyección histórica en tab anual. */
  readonly allHistoricalMonthlyTotals = computed(() =>
    this.analyticsService.getMonthlyTotals(
      this.completedTxs(),
      9999,
      this.userSettingsState.monthStartDay(),
    )
  );

  /** Últimos 4 períodos completos — para el componente de proyección fuera del tab anual. */
  readonly monthlyTotals = computed(() =>
    this.analyticsService.getMonthlyTotals(
      this.completedTxs(),
      4,
      this.userSettingsState.monthStartDay(),
    )
  );

  readonly periods = computed(() => this.monthlyTotals().map(t => t.period));

  /** Totales agrupados por año — todo el historial disponible. */
  readonly yearlyTotals = computed(() =>
    this.analyticsService.getYearlyTotals(this.allTxs(), this.userSettingsState.monthStartDay())
  );

  /**
   * Ahorro neto del período mensual en curso (siempre mes actual, no afectado por navegación).
   * Usa PeriodService para obtener el rango correcto según monthStartDay.
   */
  readonly savingsCurrentMonth = computed(() => {
    const { from, to } = this.periodService.getDateRange(
      'month', new Date(), this.userSettingsState.monthStartDay(), 0,
    );
    const monthTxs = this.allTxs().filter(tx => tx.date >= from && tx.date <= to);
    return this.analyticsService.calculateSummary(monthTxs).balance;
  });

  /**
   * 12 SavingPoint del año seleccionado, uno por mes, respetando monthStartDay.
   * Usa yearMonthlyData() cuando está en tab año; si no, calcula para el año actual.
   * Siempre 12 elementos con ceros donde no hay datos.
   */
  readonly savingsCurrentYear = computed(() => {
    const { tab, isCustomRange } = this.periodState();
    const msd = this.userSettingsState.monthStartDay();

    const data = (tab === 'year' && !isCustomRange)
      ? this.yearMonthlyData()
      : this.analyticsService.getYearMonthlyTotals(
          this.allTxs(),
          new Date().getFullYear(),
          msd,
        );
    return data.map(t => ({ period: t.period, saving: t.income - t.expense }));
  });

  /** Un SavingPoint por año — reutiliza yearlyTotals() ya computado. */
  readonly savingsAllYears = computed(() =>
    this.yearlyTotals().map(t => ({ period: t.period, saving: t.income - t.expense }))
  );

  /** Resumen del período activo (ingresos, gastos, balance). */
  readonly currentPeriodSummary = computed(() =>
    this.analyticsService.calculateSummary(this.filteredTxs())
  );

  readonly spendingData = computed(() =>
    this.analyticsService.classifySpending(this.filteredTxs(), this.periods())
  );

  readonly categorySpending = computed(() =>
    this.analyticsService.getCategorySpending(this.filteredTxs(), this.categories())
  );

  ngOnInit(): void {
    this.txState.load();
    this.categoriesState.load();
    this.userSettingsState.load();
  }

  onPeriodChange(state: PeriodNavigatorState): void {
    this.periodState.set(state);
  }
}
