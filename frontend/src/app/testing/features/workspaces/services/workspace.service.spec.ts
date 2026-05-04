import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of, firstValueFrom } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkspaceService, rowToWorkspace, workspaceToRow } from '@features/workspaces/services/workspace.service';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { AuthService } from '@core/services/auth.service';
import { IWorkspace } from '@models/workspace.model';

// ─────────────────────────────────────────────────────────────────────────────
// rowToWorkspace — mapper puro, sin DI
// ─────────────────────────────────────────────────────────────────────────────
describe('rowToWorkspace', () => {
  it('maps all 7 fields from WORKSPACES schema correctly', () => {
    const row = ['ws_001', 'usr_001', 'Casa', '🏠', '--color-green-500', '2026-04-01T00:00:00Z', 'true'];

    const ws = rowToWorkspace(row);

    expect(ws.workspaceId).toBe('ws_001');
    expect(ws.userId).toBe('usr_001');
    expect(ws.name).toBe('Casa');
    expect(ws.icon).toBe('🏠');
    expect(ws.color).toBe('--color-green-500');
    expect(ws.createdAt).toBe('2026-04-01T00:00:00Z');
    expect(ws.isDefault).toBe(true);
  });

  it('preserves empty string for icon and color when row has empty strings', () => {
    // rowToWorkspace usa ?? — empty string no activa el default, solo undefined/null lo hace
    const row = ['ws_002', 'usr_001', 'Trabajo', '', '', '2026-04-01T00:00:00Z', 'false'];

    const ws = rowToWorkspace(row);

    expect(ws.icon).toBe('');
    expect(ws.color).toBe('');
    expect(ws.isDefault).toBe(false);
  });

  it('parses isDefault from boolean true directly', () => {
    const row = ['ws_003', 'usr_001', 'Personal', '💼', '#AAA', '2026-04-01T00:00:00Z', true];

    const ws = rowToWorkspace(row);

    expect(ws.isDefault).toBe(true);
  });

  it('defaults all fields when row values are undefined', () => {
    const row: unknown[] = [undefined, undefined, undefined, undefined, undefined, undefined, undefined];

    const ws = rowToWorkspace(row);

    expect(ws.workspaceId).toBe('');
    expect(ws.userId).toBe('');
    expect(ws.name).toBe('');
    expect(ws.icon).toBe('🏠');
    expect(ws.isDefault).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// workspaceToRow — mapper inverso
// ─────────────────────────────────────────────────────────────────────────────
describe('workspaceToRow', () => {
  it('round-trips a workspace through row conversion', () => {
    const ws: IWorkspace = {
      workspaceId: 'ws_001',
      userId: 'usr_001',
      name: 'Casa',
      icon: '🏠',
      color: '--color-green-500',
      createdAt: '2026-04-01T00:00:00Z',
      isDefault: true,
    };

    const row = workspaceToRow(ws);
    const restored = rowToWorkspace(row);

    expect(restored.workspaceId).toBe(ws.workspaceId);
    expect(restored.name).toBe(ws.name);
    expect(restored.isDefault).toBe(ws.isDefault);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceService — loadWorkspaces
// ─────────────────────────────────────────────────────────────────────────────
describe('WorkspaceService.loadWorkspaces', () => {
  let spectator: SpectatorService<WorkspaceService>;
  const createService = createServiceFactory({
    service: WorkspaceService,
    mocks: [SheetsApiService, AuthService],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });

  beforeEach(() => {
    spectator = createService();
    spectator.inject(AuthService).getUser.mockReturnValue({ sub: 'usr_001', email: 'a@b.com', name: 'Test' });
  });

  // sc1: hoja vacía → {workspaces:[], rowMap:{}}
  it('loadWorkspaces_shouldReturnEmpty_whenResponseHasNoValues', async () => {
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of({ range: 'WORKSPACES!A:G', majorDimension: 'ROWS', values: [] }),
    );

    const result = await firstValueFrom(spectator.service.loadWorkspaces());

    expect(result.workspaces).toEqual([]);
    expect(result.rowMap).toEqual({});
  });

  // sc2: respuesta null → vacío sin error
  it('loadWorkspaces_shouldReturnEmpty_whenResponseIsNull', async () => {
    spectator.inject(SheetsApiService).getRange.mockReturnValue(of(null));

    const result = await firstValueFrom(spectator.service.loadWorkspaces());

    expect(result.workspaces).toEqual([]);
    expect(result.rowMap).toEqual({});
  });

  // sc3: solo header → vacío
  it('loadWorkspaces_shouldReturnEmpty_whenOnlyHeaderRow', async () => {
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of({
        range: 'WORKSPACES!A:G',
        majorDimension: 'ROWS',
        values: [['workspace_id', 'user_id', 'name', 'icon', 'color', 'created_at', 'is_default']],
      }),
    );

    const result = await firstValueFrom(spectator.service.loadWorkspaces());

    expect(result.workspaces).toEqual([]);
    expect(result.rowMap).toEqual({});
  });

  // sc4: filtra por userId y construye rowMap correctamente
  it('loadWorkspaces_shouldFilterByUserId_andBuildRowMap', async () => {
    spectator.inject(SheetsApiService).getRange.mockReturnValue(
      of({
        range: 'WORKSPACES!A:G',
        majorDimension: 'ROWS',
        values: [
          ['workspace_id', 'user_id', 'name', 'icon', 'color', 'created_at', 'is_default'],
          ['ws_001', 'usr_001', 'Casa', '🏠', '--color-green-500', '2026-04-01T00:00:00Z', 'true'],
          ['ws_002', 'usr_other', 'Ajena', '🏢', '#aaa', '2026-04-01T00:00:00Z', 'false'],
          ['ws_003', 'usr_001', 'Trabajo', '💼', '#bbb', '2026-04-01T00:00:00Z', 'false'],
        ],
      }),
    );

    const result = await firstValueFrom(spectator.service.loadWorkspaces());

    expect(result.workspaces.length).toBe(2);
    expect(result.workspaces[0].workspaceId).toBe('ws_001');
    expect(result.workspaces[1].workspaceId).toBe('ws_003');
    expect(result.rowMap['ws_001']).toBe(2);
    expect(result.rowMap['ws_003']).toBe(4);
    expect(result.rowMap['ws_002']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceService — write operations
// ─────────────────────────────────────────────────────────────────────────────
describe('WorkspaceService — write operations', () => {
  let spectator: SpectatorService<WorkspaceService>;
  const createService = createServiceFactory({
    service: WorkspaceService,
    mocks: [SheetsApiService, AuthService],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });

  const mockWorkspace: IWorkspace = {
    workspaceId: 'ws_001',
    userId: 'usr_001',
    name: 'Casa',
    icon: '🏠',
    color: '--color-green-500',
    createdAt: '2026-04-01T00:00:00Z',
    isDefault: true,
  };

  beforeEach(() => {
    spectator = createService();
    spectator.inject(SheetsApiService).appendRow.mockReturnValue(of(undefined));
    spectator.inject(SheetsApiService).updateRow.mockReturnValue(of(undefined));
    spectator.inject(SheetsApiService).deleteRow.mockReturnValue(of(undefined));
  });

  // saveWorkspace — llama a appendRow con la fila correcta
  it('saveWorkspace_shouldCallAppendRow_withWorkspaceRow', async () => {
    await firstValueFrom(spectator.service.saveWorkspace(mockWorkspace));

    expect(spectator.inject(SheetsApiService).appendRow).toHaveBeenCalledWith(
      'WORKSPACES!A1',
      [workspaceToRow(mockWorkspace)],
    );
  });

  // updateWorkspace — llama a updateRow con el rango correcto
  it('updateWorkspace_shouldCallUpdateRow_withCorrectRange', async () => {
    await firstValueFrom(spectator.service.updateWorkspace(mockWorkspace, 4));

    expect(spectator.inject(SheetsApiService).updateRow).toHaveBeenCalledWith(
      'WORKSPACES!A4:G4',
      [workspaceToRow(mockWorkspace)],
    );
  });

  // deleteWorkspace — llama a deleteRow con el rango correcto
  it('deleteWorkspace_shouldCallDeleteRow_withCorrectRange', async () => {
    await firstValueFrom(spectator.service.deleteWorkspace(7));

    expect(spectator.inject(SheetsApiService).deleteRow).toHaveBeenCalledWith(
      'WORKSPACES!A7:G7',
    );
  });
});
