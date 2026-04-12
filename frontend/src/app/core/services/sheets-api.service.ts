import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SheetValuesResponse {
  range: string;
  majorDimension: string;
  values: unknown[][];
}

/**
 * SheetsApiService — única puerta de entrada a Google Sheets API v4.
 *
 * Llama directamente a la Sheets API REST usando el Bearer token OAuth2
 * del usuario (añadido por authInterceptor). Sin servidor Express intermedio.
 *
 * Caché ETag: almacena el ETag de cada rango leído. En la siguiente llamada
 * envía If-None-Match — si Sheets responde 304 (sin cambios), retorna null
 * y el efecto NgRx reutiliza el store cacheado.
 */
@Injectable({ providedIn: 'root' })
export class SheetsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${environment.spreadsheetId}/values`;
  private readonly etagCache = new Map<string, string>();

  /**
   * Lee un rango de la Spreadsheet.
   * Retorna null si los datos no cambiaron (304 / ETag match).
   * El authInterceptor añade el Bearer token automáticamente.
   */
  getRange(range: string): Observable<SheetValuesResponse | null> {
    const headers: Record<string, string> = {};
    if (this.etagCache.has(range)) {
      headers['If-None-Match'] = this.etagCache.get(range)!;
    }

    return this.http.get<SheetValuesResponse>(
      `${this.baseUrl}/${encodeURIComponent(range)}`,
      { observe: 'response', headers: new HttpHeaders(headers) },
    ).pipe(
      map(response => {
        const etag = response.headers.get('ETag');
        if (etag) {
          this.etagCache.set(range, etag);
        }
        return response.body;
      }),
    );
  }

  /**
   * Añade filas al final del rango indicado.
   * Ej: appendRow('TRANSACTIONS!A:O', [[...]])
   */
  appendRow(range: string, values: unknown[][]): Observable<unknown> {
    return this.http.post(
      `${this.baseUrl}/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
      { values },
    );
  }

  /**
   * Sobreescribe un rango específico.
   * Ej: updateRow('TRANSACTIONS!A2:O2', [[...]])
   */
  updateRow(range: string, values: unknown[][]): Observable<unknown> {
    return this.http.put(
      `${this.baseUrl}/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      { values },
    );
  }

  /**
   * Borra el contenido de un rango (borrado lógico).
   * Ej: deleteRow('TRANSACTIONS!A2:O2')
   */
  deleteRow(range: string): Observable<unknown> {
    return this.http.post(
      `${this.baseUrl}/${encodeURIComponent(range)}:clear`,
      {},
    );
  }
}
