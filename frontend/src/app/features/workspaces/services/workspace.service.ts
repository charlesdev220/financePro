import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
import { IWorkspace } from '@models/workspace.model';

// WORKSPACES schema (A:G — 7 columnas)
// A: workspace_id | B: user_id | C: name | D: icon | E: color | F: created_at | G: is_default

export function rowToWorkspace(row: unknown[]): IWorkspace {
  return {
    workspaceId: String(row[0] ?? ''),
    userId:      String(row[1] ?? ''),
    name:        String(row[2] ?? ''),
    icon:        String(row[3] ?? '🏠'),
    color:       String(row[4] ?? '--color-green-500'),
    createdAt:   String(row[5] ?? new Date().toISOString()),
    isDefault:   row[6] === true || String(row[6] ?? 'false').toLowerCase() === 'true',
  };
}

export function workspaceToRow(ws: IWorkspace): unknown[] {
  return [
    ws.workspaceId,
    ws.userId,
    ws.name,
    ws.icon,
    ws.color,
    ws.createdAt,
    ws.isDefault,
  ];
}

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly sheetsApi = inject(SheetsApiService);
  private readonly authService = inject(AuthService);

  loadWorkspaces(): Observable<{ workspaces: IWorkspace[]; rowMap: Record<string, number> }> {
    return this.sheetsApi.getRange('WORKSPACES!A:G').pipe(
      map(response => {
        if (!response?.values || response.values.length < 2) {
          return { workspaces: [], rowMap: {} };
        }
        const allRows = response.values.slice(1);
        const userId = this.authService.getUser()?.sub ?? '';
        const rowMap: Record<string, number> = {};
        allRows.forEach((row, i) => {
          const id = String(row[0] ?? '');
          const uid = String(row[1] ?? '');
          if (id && uid === userId) rowMap[id] = i + 2;
        });
        const workspaces = allRows
          .filter(row => row[0] && String(row[1] ?? '') === userId)
          .map(rowToWorkspace);
        return { workspaces, rowMap };
      }),
    );
  }

  saveWorkspace(ws: IWorkspace): Observable<unknown> {
    return this.sheetsApi.appendRow('WORKSPACES!A1', [workspaceToRow(ws)]);
  }

  updateWorkspace(ws: IWorkspace, rowNumber: number): Observable<unknown> {
    return this.sheetsApi.updateRow(`WORKSPACES!A${rowNumber}:G${rowNumber}`, [workspaceToRow(ws)]);
  }

  deleteWorkspace(rowNumber: number): Observable<unknown> {
    return this.sheetsApi.deleteRow(`WORKSPACES!A${rowNumber}:G${rowNumber}`);
  }
}
