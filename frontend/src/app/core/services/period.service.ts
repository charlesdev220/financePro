import { Injectable } from '@angular/core';
import { PeriodTab } from '@core/constants/period.constants';

export interface DateRange {
  from: string;
  to: string;
}

const LOCALE = 'es-AR';

/** Formato ISO YYYY-MM-DD para una fecha dada */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Último día real del mes (considera años bisiestos) */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Clamp de día al último día real del mes */
function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, lastDayOfMonth(year, month));
}

/** Añade `n` meses a year/month sin desbordamiento */
function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const total = month + n;
  const newMonth = ((total % 12) + 12) % 12;
  const newYear = year + Math.floor(total / 12);
  return { year: newYear, month: newMonth };
}

@Injectable({ providedIn: 'root' })
export class PeriodService {

  /**
   * Calcula el rango de fechas { from, to } para la combinación de tab, día de inicio de mes,
   * fecha de referencia y offset de navegación.
   */
  getDateRange(
    tab: PeriodTab,
    today: Date,
    monthStartDay: number,
    offset: number,
  ): DateRange {
    switch (tab) {
      case 'day':
        return this._dayRange(today, offset);
      case 'week':
        return this._weekRange(today, offset);
      case 'month':
        return this._monthRange(today, monthStartDay, offset);
      case 'year':
        return this._yearRange(today, monthStartDay, offset);
    }
  }

  /**
   * Devuelve la etiqueta legible del período para mostrar en el header del dashboard.
   */
  getPeriodLabel(
    tab: PeriodTab,
    today: Date,
    monthStartDay: number,
    offset: number,
  ): string {
    const range = this.getDateRange(tab, today, monthStartDay, offset);

    switch (tab) {
      case 'day': {
        const date = new Date(range.from + 'T12:00:00');
        const formatted = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short' }).format(date);
        return offset === 0
          ? `Hoy, ${formatted}`
          : `Día, ${formatted}`;
      }
      case 'week': {
        const from = new Date(range.from + 'T12:00:00');
        const to   = new Date(range.to   + 'T12:00:00');
        const fmtFrom = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short' }).format(from);
        const fmtTo   = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short' }).format(to);
        return `${fmtFrom} – ${fmtTo}`;
      }
      case 'month': {
        if (monthStartDay === 1) {
          const date = new Date(range.from + 'T12:00:00');
          const month = new Intl.DateTimeFormat(LOCALE, { month: 'long' }).format(date);
          const year  = date.getFullYear();
          return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
        } else {
          const from = new Date(range.from + 'T12:00:00');
          const to   = new Date(range.to   + 'T12:00:00');
          const year = to.getFullYear();
          const fmtFrom = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' }).format(from);
          const fmtTo   = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' }).format(to);
          return `${fmtFrom} – ${fmtTo} ${year}`;
        }
      }
      case 'year': {
        return String(today.getFullYear() + offset);
      }
    }
  }

  // ── Rangos privados ──────────────────────────────────────────────────────────

  private _dayRange(today: Date, offset: number): DateRange {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const iso = toIsoDate(d);
    return { from: iso, to: iso };
  }

  private _weekRange(today: Date, offset: number): DateRange {
    // Lunes de la semana actual
    const d = new Date(today);
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay(); // 1=lun … 7=dom
    d.setDate(d.getDate() - (dayOfWeek - 1) + offset * 7);
    const monday = toIsoDate(d);
    const sunday = new Date(d);
    sunday.setDate(sunday.getDate() + 6);
    return { from: monday, to: toIsoDate(sunday) };
  }

  private _monthRange(today: Date, monthStartDay: number, offset: number): DateRange {
    const start = Math.max(1, Math.min(28, monthStartDay));

    if (start === 1) {
      // Mes calendario
      const base = addMonths(today.getFullYear(), today.getMonth(), offset);
      const firstDay = toIsoDate(new Date(base.year, base.month, 1));
      const lastDay  = toIsoDate(new Date(base.year, base.month + 1, 0));
      return { from: firstDay, to: lastDay };
    }

    // Mes custom: empieza el día `start` de algún mes
    // Determinar en qué "mes custom" cae `today`
    const todayDay = today.getDate();
    let periodYear  = today.getFullYear();
    let periodMonth = today.getMonth(); // índice 0-based del mes en que comienza el período

    if (todayDay < start) {
      // Estamos antes del día de inicio: el período empezó el mes anterior
      const prev = addMonths(periodYear, periodMonth, -1);
      periodYear  = prev.year;
      periodMonth = prev.month;
    }

    // Aplicar offset de navegación
    const withOffset = addMonths(periodYear, periodMonth, offset);
    const fromYear  = withOffset.year;
    const fromMonth = withOffset.month;

    const fromDay = clampDay(fromYear, fromMonth, start);
    const from    = toIsoDate(new Date(fromYear, fromMonth, fromDay));

    // El período termina el día (start - 1) del mes siguiente
    const toBase   = addMonths(fromYear, fromMonth, 1);
    const toDay    = clampDay(toBase.year, toBase.month, start - 1);
    const to       = toIsoDate(new Date(toBase.year, toBase.month, toDay));

    return { from, to };
  }

  private _yearRange(today: Date, monthStartDay: number, offset: number): DateRange {
    const year  = today.getFullYear() + offset;
    const start = Math.max(1, Math.min(28, monthStartDay));
    if (start <= 1) {
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
    // Con monthStartDay > 1, el año comienza el día `start` de diciembre del año anterior.
    // Ej: monthStartDay=27 → año 2026 va de 2025-12-27 a 2026-12-26
    const fromDay = String(start).padStart(2, '0');
    const toDay   = String(start - 1).padStart(2, '0');
    return {
      from: `${year - 1}-12-${fromDay}`,
      to:   `${year}-12-${toDay}`,
    };
  }
}
