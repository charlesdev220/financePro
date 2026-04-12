import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface ExchangeRateApiResponse {
  result: string;
  conversion_rate: number;
}

interface CacheEntry {
  rate: number;
  timestamp: number;
}

/**
 * CurrencyApiService — obtiene tasas de cambio de ExchangeRate-API v6.
 *
 * - Caché en memoria con TTL de 1 hora (REQ-02).
 * - Si from === to retorna 1 sin llamar a la API (REQ-01 sc3).
 * - Si la API falla retorna 1 como fallback (REQ-01 sc2).
 */
@Injectable({ providedIn: 'root' })
export class CurrencyApiService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 60 * 60 * 1000; // 1 hora

  getRate(from: string, to: string): Observable<number> {
    if (from === to) return of(1);

    const key = `${from}_${to}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.TTL_MS) {
      return of(cached.rate);
    }

    return this.http
      .get<ExchangeRateApiResponse>(
        `https://v6.exchangerate-api.com/v6/${environment.currencyApiKey}/pair/${from}/${to}`,
      )
      .pipe(
        map(response => {
          const rate = response.conversion_rate;
          this.cache.set(key, { rate, timestamp: Date.now() });
          return rate;
        }),
        catchError(err => {
          console.warn('[CurrencyApiService] Error al obtener tasa, usando fallback 1:1', err);
          return of(1);
        }),
      );
  }

  /** Verifica si la tasa cacheada está vigente (< 1 hora). */
  isCacheValid(from: string, to: string): boolean {
    if (from === to) return true;
    const entry = this.cache.get(`${from}_${to}`);
    return !!entry && Date.now() - entry.timestamp < this.TTL_MS;
  }
}
