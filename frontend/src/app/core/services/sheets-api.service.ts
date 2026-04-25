import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';

export interface SheetValuesResponse {
  range: string;
  majorDimension: string;
  values: unknown[][];
}

/**
 * SheetsApiService — única puerta de entrada a Google Sheets API v4.
 *
 * Llama directamente a la Sheets API REST usando el Bearer token OAuth2
 * de la Service Account (obtenido via AuthService).
 *
 * Caché ETag: almacena el ETag de cada rango leído. En la siguiente llamada
 * envía If-None-Match — si Sheets responde 304 (sin cambios), retorna null
 * y el efecto NgRx reutiliza el store cacheado.
 */
@Injectable({ providedIn: 'root' })
export class SheetsApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${environment.spreadsheetId}/values`;
  private readonly etagCache = new Map<string, string>();

  /**
   * Lee un rango de la Spreadsheet.
   * Retorna null si los datos no cambiaron (304 / ETag match).
   */
  getRange(range: string): Observable<SheetValuesResponse | null> {
    return this.http.get<SheetValuesResponse>(
      `${this.baseUrl}/${encodeURIComponent(range)}`,
      { observe: 'response', headers: this.getHeaders(range) },
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
      { headers: this.getHeaders() }
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
      { headers: this.getHeaders() }
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
      { headers: this.getHeaders() }
    );
  }

  private getHeaders(range?: string): HttpHeaders {
    let headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getAccessToken() || ''}`
    });
    if (range && this.etagCache.has(range)) {
      headers = headers.set('If-None-Match', this.etagCache.get(range)!);
    }
    return headers;
  }
}
