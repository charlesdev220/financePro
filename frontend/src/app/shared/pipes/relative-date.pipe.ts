import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pure pipe — converts an ISO 8601 date string to a human-readable relative label.
 * Usage: {{ transaction.date | relativeDate }} → "Hoy", "Ayer", "Hace 3 días", etc.
 */
@Pipe({ name: 'relativeDate', standalone: true, pure: true })
export class RelativeDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';

    const inputDate = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    if (isNaN(inputDate.getTime())) return value ?? '—';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(inputDate);
    target.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - target.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays > 1 && diffDays <= 6) return `Hace ${diffDays} días`;
    if (diffDays === 7) return 'Hace 1 semana';
    if (diffDays > 7 && diffDays <= 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    if (diffDays > 30 && diffDays <= 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
    return `Hace ${Math.floor(diffDays / 365)} años`;
  }
}
