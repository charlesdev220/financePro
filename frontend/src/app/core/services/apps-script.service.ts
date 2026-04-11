import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, EMPTY } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AppsScriptService {
  private readonly http = inject(HttpClient);

  /**
   * POST to the Google Apps Script Web App.
   * Used for all writes with business logic (transactions, budget updates, concept upserts).
   * The Apps Script router dispatches by `action` to the appropriate handler.
   */
  post(action: string, payload: Record<string, unknown>): Observable<unknown> {
    if (!environment.appsScriptUrl) return EMPTY;
    return this.http.post(environment.appsScriptUrl, { action, ...payload });
  }
}
