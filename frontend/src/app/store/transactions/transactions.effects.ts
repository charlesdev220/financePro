import { Injectable, inject } from '@angular/core';
import { Actions } from '@ngrx/effects';

@Injectable()
export class TransactionsEffects {
  private readonly actions$ = inject(Actions);
  // Effects connecting to SheetsApiService will be added in Phase 2 (Fase 2 del plan)
}
