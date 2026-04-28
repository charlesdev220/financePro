/**
 * Excepción arquitectónica: este service llama directamente a SheetsApiService.
 * Regla ngrx.md: "SheetsApiService solo en Effects".
 * Motivo: ConceptsService mantiene el upsert de conceptos únicos por usuario (vocabulario
 * autocompletado) — es una operación auxiliar que se ejecuta como efecto secundario al
 * confirmar una transacción, sin estado NgRx propio. Moverlo a un effect requeriría
 * un feature store dedicado para un dato de UI efímero.
 * Decisión aprobada en CLAUDE.md como excepción documentada de servicio auxiliar.
 */
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { IConcept } from '@models/concept.model';
import { ITransaction } from '@models/transaction.model';

// CONCEPTS schema (A:G — 7 columnas)
// A: concept_id | B: user_id | C: category_id | D: text | E: usage_count | F: last_used | G: workspace_id

export function rowToConcept(row: unknown[], defaultWsId = ''): IConcept {
  return {
    conceptId:   String(row[0] ?? ''),
    userId:      String(row[1] ?? ''),
    categoryId:  String(row[2] ?? ''),
    text:        String(row[3] ?? ''),
    usageCount:  Number(row[4] ?? 0),
    lastUsed:    String(row[5] ?? new Date().toISOString()),
    workspaceId: String(row[6] ?? defaultWsId),
  };
}

function conceptToRow(concept: IConcept): unknown[] {
  return [
    concept.conceptId,
    concept.userId,
    concept.categoryId,
    concept.text,
    concept.usageCount,
    concept.lastUsed,
    concept.workspaceId,
  ];
}

@Injectable({ providedIn: 'root' })
export class ConceptsService {
  private readonly sheetsApi = inject(SheetsApiService);

  loadConcepts(defaultWsId = ''): Observable<IConcept[]> {
    return this.sheetsApi.getRange('CONCEPTS!A:G').pipe(
      map(response => {
        if (!response?.values || response.values.length < 2) return [];
        return response.values.slice(1).filter(row => row[0]).map(row => rowToConcept(row, defaultWsId));
      }),
    );
  }

  /**
   * Upsert de concepto: solo se ejecuta tras éxito confirmado de la transacción (ADR-03).
   * Clave de unicidad: (user_id, category_id, text normalizado).
   *
   * Si ya existe: updateRow con usage_count + 1 y last_used = now.
   * Si no existe: appendRow con nuevo concept_id.
   */
  async upsertConcept(tx: ITransaction, defaultWsId = ''): Promise<void> {
    if (!tx.concept.trim()) return; // concepto vacío → no-op (REQ-08 sc3)

    const normalizedText = tx.concept.toLowerCase().trim();
    const allConcepts = await firstValueFrom(this.loadConcepts(defaultWsId));

    // Cargar el range completo para encontrar el row number (índice en Sheets)
    const response = await firstValueFrom(this.sheetsApi.getRange('CONCEPTS!A:G'));
    const allRows = response?.values?.slice(1) ?? [];

    const existingIndex = allConcepts.findIndex(
      c =>
        c.userId === tx.userId &&
        c.categoryId === tx.categoryId &&
        c.text.toLowerCase().trim() === normalizedText,
    );

    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = allConcepts[existingIndex];
      // Encontrar el row number real en Sheets (puede haber filas vacías)
      let sheetRow = 2;
      let found = 0;
      for (let i = 0; i < allRows.length; i++) {
        if (allRows[i][0]) {
          if (found === existingIndex) { sheetRow = i + 2; break; }
          found++;
        }
      }
      const updated: IConcept = {
        ...existing,
        usageCount: existing.usageCount + 1,
        lastUsed: now,
      };
      await firstValueFrom(
        this.sheetsApi.updateRow(`CONCEPTS!A${sheetRow}:G${sheetRow}`, [conceptToRow(updated)]),
      );
    } else {
      const newConcept: IConcept = {
        conceptId:   crypto.randomUUID(),
        userId:      tx.userId,
        categoryId:  tx.categoryId,
        text:        tx.concept.trim(),
        usageCount:  1,
        lastUsed:    now,
        workspaceId: tx.workspaceId || defaultWsId,
      };
      await firstValueFrom(
        this.sheetsApi.appendRow('CONCEPTS!A1', [conceptToRow(newConcept)]),
      );
    }
  }

  /**
   * Retorna sugerencias filtradas por (categoryId, prefix), ordenadas por usage_count DESC.
   * Método puro — opera sobre el array cargado, sin llamar a Sheets (REQ-09).
   */
  getSuggestions(categoryId: string, prefix: string, concepts: IConcept[]): string[] {
    const normalizedPrefix = prefix.toLowerCase().trim();
    return concepts
      .filter(
        c =>
          c.categoryId === categoryId &&
          c.text.toLowerCase().startsWith(normalizedPrefix),
      )
      .sort((a, b) => b.usageCount - a.usageCount)
      .map(c => c.text);
  }
}
