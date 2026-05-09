import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartDataset } from 'chart.js';
import { ChartBarComponent } from '@shared/components/chart-bar/chart-bar.component';
import { SavingPoint } from '@features/analytics/services/analytics.service';
import { APP_COLORS } from '@core/constants/colors.constants';
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';

const MONTH_SHORT_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

@Component({
  selector: 'app-savings-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChartBarComponent, CurrencyFormatPipe],
  templateUrl: './savings-chart.component.html',
})
export class SavingsChartComponent {
  /**
   * Ahorro neto del mes calendario en curso (un único número).
   * Lo pasa AnalyticsPage desde savingsCurrentMonth().
   */
  currentMonth = input.required<number>();

  /**
   * Array de 12 SavingPoint con el ahorro mes a mes del año actual.
   * Lo pasa AnalyticsPage desde savingsCurrentYear().
   */
  currentYear = input.required<SavingPoint[]>();

  /**
   * Un SavingPoint por año disponible en el historial.
   * Lo pasa AnalyticsPage desde savingsAllYears().
   */
  allYears = input.required<SavingPoint[]>();

  /**
   * Moneda base del usuario — se muestra junto al valor del mes en curso.
   * Lo pasa AnalyticsPage desde userBaseCurrency().
   */
  currency = input.required<string>();

  /**
   * Controla qué sección renderiza: false = valor del mes, true = gráficos anuales.
   * Lo pasa AnalyticsPage desde activePeriodTab() === 'year'.
   */
  isYearView = input.required<boolean>();

  /** True si el ahorro del mes en curso es positivo. */
  readonly isMonthPositive = computed(() => this.currentMonth() > 0);

  /** True si el ahorro del mes en curso es negativo. */
  readonly isMonthNegative = computed(() => this.currentMonth() < 0);

  /** Prefijo con signo para el valor del mes — '+' si positivo, vacío si 0 o negativo (ya incluye '–'). */
  readonly monthPrefix = computed(() => (this.currentMonth() > 0 ? '+' : ''));

  /**
   * Labels del eje X para la vista anual (12 meses).
   * El mes en curso lleva asterisco para indicar datos parciales.
   */
  readonly yearLabels = computed<string[]>(() => {
    const currentMonthIndex = new Date().getMonth(); // 0-based
    return this.currentYear().map((_, i) => {
      const label = MONTH_SHORT_LABELS[i];
      return i === currentMonthIndex ? `${label} *` : label;
    });
  });

  /** Dataset de barras para la vista "Este año" — colores por signo del ahorro. */
  readonly yearDatasets = computed<ChartDataset[]>(() => [
    {
      label: 'Ahorro',
      data: this.currentYear().map(p => p.saving),
      backgroundColor: this.currentYear().map(p =>
        p.saving >= 0 ? APP_COLORS.GREEN : APP_COLORS.RED
      ),
      borderWidth: 0,
      borderRadius: 4,
    },
  ]);

  /** Labels del eje X para la vista histórica (un año por barra). */
  readonly allYearsLabels = computed<string[]>(() =>
    this.allYears().map(p => p.period)
  );

  /** Dataset de barras para la vista "Todos los años" — colores por signo del ahorro. */
  readonly allYearsDatasets = computed<ChartDataset[]>(() => [
    {
      label: 'Ahorro anual',
      data: this.allYears().map(p => p.saving),
      backgroundColor: this.allYears().map(p =>
        p.saving >= 0 ? APP_COLORS.GREEN : APP_COLORS.RED
      ),
      borderWidth: 0,
      borderRadius: 4,
    },
  ]);

  /** True cuando al menos un mes del año tiene ahorro distinto de cero. */
  readonly hasYearData = computed(() =>
    this.currentYear().some(p => p.saving !== 0)
  );

  /** True cuando hay datos históricos de más de un período. */
  readonly hasAllYearsData = computed(() => this.allYears().length > 0);
}
