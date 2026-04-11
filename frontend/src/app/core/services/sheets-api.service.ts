import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SheetValuesResponse {
  range:  string;
  values: unknown[][];
}

/**
 * SheetsApiService — única puerta de entrada a Google Sheets.
 * Delega al servidor Express (server/index.js) que usa googleapis + service account.
 * El private key nunca llega al frontend.
 */
@Injectable({ providedIn: 'root' })
export class SheetsApiService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/sheets`;

  /** Lee un rango. Ej: 'TRANSACTIONS!A:O' */
  getRange(range: string): Observable<SheetValuesResponse> {
    return this.http.get<SheetValuesResponse>(
      `${this.baseUrl}/values`,
      { params: { range } }
    );
  }

  /** Añade filas al final de un rango. */
  appendRow(range: string, values: unknown[][]): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/append`, { range, values });
  }

  /** Sobreescribe un rango específico. */
  updateRow(range: string, values: unknown[][]): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/values`, { range, values });
  }

  /** Limpia un rango (borrado lógico). */
  deleteRow(range: string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/values`, { params: { range } });
  }

  /** Inicializa las 8 hojas con sus encabezados (idempotente). */
  initDatabase(): Observable<{ success: boolean; sheets: string[] }> {
    return this.http.post<{ success: boolean; sheets: string[] }>(
      `${this.baseUrl}/init`,
      {}
    );
  }

  /** Verifica la conexión con el servidor y el spreadsheet. */
  healthCheck(): Observable<{ status: string; spreadsheetId: string }> {
    return this.http.get<{ status: string; spreadsheetId: string }>(
      `${environment.apiUrl}/api/health`
    );
  }
}
