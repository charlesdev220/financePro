import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';

import { WorkspacesStateService } from '@core/state/workspaces.state';
import { WorkspaceService } from '@features/workspaces/services/workspace.service';
import { AuthService } from '@core/services/auth.service';
import { MOCK_WORKSPACES, MOCK_WORKSPACE_ID_A, MOCK_WORKSPACE_ID_B } from '../../fixtures';

// ─────────────────────────────────────────────────────────────────────────────
// WorkspacesStateService — REQ-02, REQ-08
// ─────────────────────────────────────────────────────────────────────────────
describe('WorkspacesStateService', () => {
  let spectator: SpectatorService<WorkspacesStateService>;

  const createService = createServiceFactory({
    service: WorkspacesStateService,
    mocks: [WorkspaceService, AuthService],
  });

  const TWO_WS = MOCK_WORKSPACES;

  beforeEach(() => {
    spectator = createService();
    spectator.inject(AuthService).getUser.mockReturnValue(
      { sub: 'usr_001', name: 'Test', email: 'test@test.com' },
    );
    spectator.inject(WorkspaceService).saveWorkspace.mockReturnValue(of(undefined));
    spectator.inject(WorkspaceService).updateWorkspace.mockReturnValue(of(undefined));
    spectator.inject(WorkspaceService).deleteWorkspace.mockReturnValue(of(undefined));
  });

  // REQ-02 sc1 — load() con workspaces en Sheets → items() poblado
  it('load_shouldSetItems_whenWorkspacesExist', fakeAsync(() => {
    const rowMap = { [MOCK_WORKSPACE_ID_A]: 2, [MOCK_WORKSPACE_ID_B]: 3 };
    spectator.inject(WorkspaceService).loadWorkspaces.mockReturnValue(
      of({ workspaces: TWO_WS, rowMap }),
    );

    spectator.service.load();
    flushMicrotasks();

    expect(spectator.service.items().length).toBe(2);
    expect(spectator.service.loading()).toBe(false);
    expect(spectator.service.error()).toBeNull();
  }));

  // REQ-02 sc2 — load() con workspaces → activeWorkspaceId es el default
  it('load_shouldSetActiveToDefault_whenWorkspacesExist', fakeAsync(() => {
    spectator.inject(WorkspaceService).loadWorkspaces.mockReturnValue(
      of({ workspaces: TWO_WS, rowMap: { [MOCK_WORKSPACE_ID_A]: 2 } }),
    );

    spectator.service.load();
    flushMicrotasks();

    expect(spectator.service.activeWorkspaceId()).toBe(MOCK_WORKSPACE_ID_A);
    expect(spectator.service.defaultWorkspaceId()).toBe(MOCK_WORKSPACE_ID_A);
  }));

  // REQ-02 sc3 — load() sin workspaces → crea workspace 'Personal' automáticamente
  it('load_shouldCreatePersonalWorkspace_whenNoWorkspacesExist', fakeAsync(() => {
    const createdWs = { workspaceId: 'ws_default', name: 'Personal', isDefault: true, userId: 'usr_001', icon: '🏠', color: '--color-green-500', createdAt: new Date().toISOString() };
    spectator.inject(WorkspaceService).loadWorkspaces
      .mockReturnValueOnce(of({ workspaces: [], rowMap: {} }))
      .mockReturnValueOnce(of({ workspaces: [createdWs], rowMap: { 'ws_default': 2 } }));

    spectator.service.load();
    flushMicrotasks();

    expect(spectator.inject(WorkspaceService).saveWorkspace).toHaveBeenCalledTimes(1);
    const calls = spectator.inject(WorkspaceService).saveWorkspace.mock.calls;
    const savedWs = calls[calls.length - 1][0];
    expect(savedWs.name).toBe('Personal');
    expect(savedWs.isDefault).toBe(true);
  }));

  // REQ-02 sc4 — setActive() → activeWorkspaceId actualiza sin HTTP
  it('setActive_shouldUpdateActiveWorkspaceId_withoutHTTP', () => {
    spectator.service.setActive(MOCK_WORKSPACE_ID_B);

    expect(spectator.service.activeWorkspaceId()).toBe(MOCK_WORKSPACE_ID_B);
    expect(spectator.inject(WorkspaceService).loadWorkspaces).not.toHaveBeenCalled();
  });

  // REQ-08 sc1 — delete() en workspace default → no ejecuta deleteWorkspace
  it('delete_shouldNotDelete_whenWorkspaceIsDefault', fakeAsync(() => {
    spectator.inject(WorkspaceService).loadWorkspaces.mockReturnValue(
      of({ workspaces: TWO_WS, rowMap: { [MOCK_WORKSPACE_ID_A]: 2 } }),
    );
    spectator.service.load();
    flushMicrotasks();

    spectator.service.delete(MOCK_WORKSPACE_ID_A, 2);
    flushMicrotasks();

    expect(spectator.inject(WorkspaceService).deleteWorkspace).not.toHaveBeenCalled();
    expect(spectator.service.items().length).toBe(2);
  }));

  // REQ-02 sc5 — load() con error de API → error() en lenguaje natural, no stack trace
  it('load_shouldSetError_whenLoadFails', fakeAsync(() => {
    spectator.inject(WorkspaceService).loadWorkspaces.mockReturnValue(
      throwError(() => new Error('Network error')),
    );

    spectator.service.load();
    flushMicrotasks();

    expect(spectator.service.error()).not.toBeNull();
    expect(spectator.service.items().length).toBe(0);
    expect(spectator.service.loading()).toBe(false);
  }));

  // REQ-05 sc1 — create() activa sincrónicamente el nuevo workspace
  it('create_shouldSetActiveWorkspaceId_synchronously', () => {
    const prevActive = spectator.service.activeWorkspaceId();

    spectator.service.create({
      userId: 'usr_001',
      name: 'Nuevo',
      icon: '🆕',
      color: '--color-green-500',
      isDefault: false,
    });

    const newActive = spectator.service.activeWorkspaceId();
    expect(newActive).not.toBe(prevActive);
    expect(newActive).toMatch(/^ws_/);
    expect(spectator.service.items().some(ws => ws.workspaceId === newActive)).toBe(true);
  });

  // REQ-05 sc3 — create() revierte _allItems si saveWorkspace falla
  it('create_shouldRollbackItems_whenSaveFails', fakeAsync(() => {
    spectator.inject(WorkspaceService).loadWorkspaces.mockReturnValue(
      of({ workspaces: MOCK_WORKSPACES, rowMap: { [MOCK_WORKSPACE_ID_A]: 2, [MOCK_WORKSPACE_ID_B]: 3 } }),
    );
    spectator.service.load();
    flushMicrotasks();

    const prevCount = spectator.service.items().length;
    spectator.inject(WorkspaceService).saveWorkspace.mockReturnValue(
      throwError(() => new Error('net')),
    );

    spectator.service.create({
      userId: 'usr_001',
      name: 'Fallido',
      icon: '❌',
      color: '--color-green-500',
      isDefault: false,
    }).catch(() => { /* rollback esperado */ });
    flushMicrotasks();

    expect(spectator.service.items().length).toBe(prevCount);
    expect(spectator.service.error()).not.toBeNull();
  }));
});
