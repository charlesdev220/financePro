import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonInput,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, calendarOutline, closeOutline } from 'ionicons/icons';

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
import { PeriodSelectorComponent } from '@shared/components/period-selector/period-selector.component';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';
import { PeriodTab } from '@core/constants/period.constants';


function monthsInRange(tab: PeriodTab): number {
  return tab === 'year' ? 12 : 6;
}

@Component({
  selector: 'app-analytics',
  templateUrl: 'analytics.page.html',
  styleUrls: [],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonIcon, IonInput,
    PeriodSelectorComponent,
    AnalyticsChartComponent,
    CategorySpendingChartComponent,
    ProjectionsComponent,
    SpendingRankingComponent,
    CurrencyFormatPipe,
  ],
})
export class AnalyticsPage implements OnInit {
  private readonly txState = inject(TransactionsStateService);
  private readonly categoriesState = inject(CategoriesStateService);
  private readonly currencyState = inject(CurrencyStateService);
  private readonly userSettingsState = inject(UserSettingsStateService);
  private readonly periodService = inject(PeriodService);
  private readonly analyticsService = inject(AnalyticsService);

  readonly allTxs = this.txState.items;
  readonly categories = this.categoriesState.items;
  readonly userBaseCurrency = computed(() => this.currencyState.baseCurrency() ?? 'EUR');

  /** Tab activo en el selector de período. */
  readonly activePeriodTab = signal<PeriodTab>('month');
  /** Offset de navegación: 0 = período actual, -1 = anterior, etc. */
  readonly navigationOffset = signal<number>(0);
  /** Modo rango personalizado activo. */
  readonly isCustomRange = signal<boolean>(false);
  /** Fecha inicio del rango personalizado (YYYY-MM-DD). */
  readonly customFrom = signal<string>('');
  /** Fecha fin del rango personalizado (YYYY-MM-DD). */
  readonly customTo = signal<string>('');

  /** Etiqueta legible del período — usa PeriodService con monthStartDay del usuario. */
  readonly periodLabel = computed(() =>
    this.periodService.getPeriodLabel(
      this.activePeriodTab(),
      new Date(),
      this.userSettingsState.monthStartDay(),
      this.navigationOffset(),
    )
  );

  /** Deshabilita la flecha > cuando ya estamos en el período actual. */
  readonly canNavigateForward = computed(() => this.navigationOffset() < 0);

  /** Rango de fechas activo — respeta monthStartDay y usa rango personalizado si está activo. */
  readonly dateRange = computed(() => {
    if (this.isCustomRange() && this.customFrom() && this.customTo()) {
      return { from: this.customFrom(), to: this.customTo() };
    }
    return this.periodService.getDateRange(
      this.activePeriodTab(),
      new Date(),
      this.userSettingsState.monthStartDay(),
      this.navigationOffset(),
    );
  });

  /** Transacciones dentro del rango activo. */
  readonly filteredTxs = computed(() => {
    const { from, to } = this.dateRange();
    return this.allTxs().filter(tx => tx.date >= from && tx.date <= to);
  });

  /** Últimos 4 períodos completos (excluye el período en curso) — para proyección a corto plazo. */
  readonly monthlyTotals = computed(() => {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const completedTxs = this.allTxs().filter(tx => tx.date.slice(0, 7) < currentPeriod);
    return this.analyticsService.getMonthlyTotals(
      completedTxs,
      4,
      this.userSettingsState.monthStartDay(),
    );
  });

  /**
   * Datos para la proyección de tendencia a corto plazo.
   * En tab anual, incluye todos los meses del año seleccionado (con ceros para meses sin datos)
   * filtrados a períodos completos — garantiza que enero aparezca aunque no tenga transacciones.
   */
  readonly projectionData = computed(() => {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const completedTxs = this.allTxs().filter(tx => tx.date.slice(0, 7) < currentPeriod);

    if (this.activePeriodTab() === 'year' && !this.isCustomRange()) {
      const year = new Date().getFullYear() + this.navigationOffset();
      const msd = this.userSettingsState.monthStartDay();
      return this.analyticsService.getYearMonthlyTotals(completedTxs, year, msd)
        .filter(t => t.period < currentPeriod);
    }

    return this.analyticsService.getMonthlyTotals(
      completedTxs,
      4,
      this.userSettingsState.monthStartDay(),
    );
  });

  /** Todo el historial de períodos completos — para proyección histórica en tab anual. */
  readonly allHistoricalMonthlyTotals = computed(() => {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const completedTxs = this.allTxs().filter(tx => tx.date.slice(0, 7) < currentPeriod);
    return this.analyticsService.getMonthlyTotals(
      completedTxs,
      9999,
      this.userSettingsState.monthStartDay(),
    );
  });

  /**
   * Totales para el gráfico de barras Ingresos vs Gastos.
   * Tab "Mes": comparación inter-anual del mismo mes en años anteriores.
   * Tab "Año": 12 períodos fijos del año (con ceros si no hay datos) — garantiza que enero siempre aparece.
   * Resto de tabs: períodos del rango activo respetando monthStartDay del usuario.
   */
  readonly chartTotals = computed(() => {
    const tab = this.activePeriodTab();
    const msd = this.userSettingsState.monthStartDay();

    if (tab === 'month' && !this.isCustomRange()) {
      const endMonth = parseInt(this.dateRange().to.slice(5, 7), 10);
      return this.analyticsService.getSameMonthAcrossYears(this.allTxs(), endMonth, msd);
    }
    if (tab === 'year') {
      const year = new Date().getFullYear() + this.navigationOffset();
      return this.analyticsService.getYearMonthlyTotals(this.filteredTxs(), year, msd);
    }
    return this.analyticsService.getMonthlyTotals(
      this.filteredTxs(),
      monthsInRange(tab),
      msd,
    );
  });

  readonly periods = computed(() => this.monthlyTotals().map(t => t.period));

  /** Totales agrupados por año — todo el historial disponible, solo visible en tab anual. */
  readonly yearlyTotals = computed(() =>
    this.analyticsService.getYearlyTotals(
      this.allTxs(),
      this.userSettingsState.monthStartDay(),
    )
  );


  /** Resumen del período activo delegado en AnalyticsService — fuente única de verdad. */
  readonly currentPeriodSummary = computed(() =>
    this.analyticsService.calculateSummary(this.filteredTxs())
  );

  readonly spendingData = computed(() =>
    this.analyticsService.classifySpending(this.filteredTxs(), this.periods()),
  );

  readonly categorySpending = computed(() =>
    this.analyticsService.getCategorySpending(this.filteredTxs(), this.categories()),
  );

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline, calendarOutline, closeOutline });
  }

  ngOnInit(): void {
    this.txState.load();
    this.categoriesState.load();
    this.userSettingsState.load();
  }

  onTabChange(tab: PeriodTab): void {
    this.activePeriodTab.set(tab);
    this.navigationOffset.set(0);
    this.isCustomRange.set(false);
  }

  onNavigatePrev(): void {
    this.isCustomRange.set(false);
    this.navigationOffset.update(v => v - 1);
  }

  onNavigateNext(): void {
    if (this.canNavigateForward()) {
      this.isCustomRange.set(false);
      this.navigationOffset.update(v => v + 1);
    }
  }

  onToggleCustomRange(): void {
    const next = !this.isCustomRange();
    this.isCustomRange.set(next);
    if (next) {
      const { from, to } = this.periodService.getDateRange(
        this.activePeriodTab(),
        new Date(),
        this.userSettingsState.monthStartDay(),
        this.navigationOffset(),
      );
      this.customFrom.set(from);
      this.customTo.set(to);
    }
  }

  onCustomFromChange(event: CustomEvent): void {
    this.customFrom.set(event.detail.value ?? '');
  }

  onCustomToChange(event: CustomEvent): void {
    this.customTo.set(event.detail.value ?? '');
  }
}
