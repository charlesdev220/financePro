import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pure pipe — converts an ISO 8601 date string to a full Spanish date label.
 * Usage: {{ transaction.date | relativeDate }} → "8 de mayo de 2026"
 */
@Pipe({ name: 'relativeDate', standalone: true, pure: true })
export class RelativeDatePipe implements PipeTransform {
  private readonly MONTHS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];

  transform(value: string | null | undefined): string {
    if (!value) return '—';

    const inputDate = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    if (isNaN(inputDate.getTime())) return value ?? '—';

    const day   = inputDate.getDate();
    const month = this.MONTHS[inputDate.getMonth()];
    const year  = inputDate.getFullYear();

    return `${day} de ${month} de ${year}`;
  }
}
