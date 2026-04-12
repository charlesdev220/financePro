import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pure pipe — formats a number as a localized currency string.
 * Usage: {{ amount | currencyFormat:'EUR' }} → "1.234,56 €"
 */
@Pipe({ name: 'currencyFormat', standalone: true, pure: true })
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: number, currencyCode: string = 'EUR', locale: string = 'es-AR'): string {
    if (value == null || isNaN(value)) return '—';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
