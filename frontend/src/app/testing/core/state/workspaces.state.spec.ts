import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { WorkspacesStateService } from '../../../core/state/workspaces.state';
import { WorkspaceService } from '../../../features/workspaces/services/workspace.service';
import { AuthService } from '../../../core/services/auth.service';
import { MOCK_WORKSPACES, MOCK_WORKSPACE_ID_A, MOCK_WORKSPACE_ID_B } from '../../fixtures';

// ─────────────────────────────────────────────────────────────────────────────
// WorkspacesStateService — REQ-02, REQ-08
// ─────────────────────────────────────────────────────────────────────────────
describe('WorkspacesStateService', () => {
  let service: WorkspacesStateService;
  let workspaceServiceSpy: jasmine.SpyObj<WorkspaceService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const TWO_WS = MOCK_WORKSPACES;
  const DEFAULT_WS = MOCK_WORKSPACES[0];

  beforeEach(() => {
    workspaceServiceSpy = jasmine.createSpyObj('WorkspaceService', [
      'loadWorkspaces',
      'saveWorkspace',
      'updateWorkspace',
      'deleteWorkspace',
    ]);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getUser']);
    authServiceSpy.getUser.and.returnValue({ sub: 'usr_001', name: 'Test', email: 'test@test.com' });

    workspaceServiceSpy.saveWorkspace.and.returnValue(of(undefined));
    workspaceServiceSpy.updateWorkspace.and.returnValue(of(undefined));
    workspaceServiceSpy.deleteWorkspace.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        WorkspacesStateService,
        { provide: WorkspaceService, useValue: workspaceServiceSpy },
        { provide: AuthService,      useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(WorkspacesStateService);
  });

  // REQ-02 sc1 — load() con workspaces en Sheets → items() poblado
  it('load_shouldSetItems_whenWorkspacesExist', fakeAsync(() => {
    const rowMap = { [MOCK_WORKSPACE_ID_A]: 2, [MOCK_WORKSPACE_ID_B]: 3 };
    workspaceServiceSpy.loadWorkspaces.and.returnValue(of({ workspaces: TWO_WS, rowMap }));

    service.load();
    flushMicrotasks();

    expect(service.items().length).toBe(2);
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
  }));

  // REQ-02 sc2 — load() con workspaces → activeWorkspaceId es el default
  it('load_shouldSetActiveToDefault_whenWorkspacesExist', fakeAsync(() => {
    workspaceServiceSpy.loadWorkspaces.and.returnValue(
      of({ workspaces: TWO_WS, rowMap: { [MOCK_WORKSPACE_ID_A]: 2 } }),
    );

    service.load();
    flushMicrotasks();

    expect(service.activeWorkspaceId()).toBe(MOCK_WORKSPACE_ID_A);
    expect(service.defaultWorkspaceId()).toBe(MOCK_WORKSPACE_ID_A);
  }));

  // REQ-02 sc3 — load() sin workspaces → crea workspace 'Personal' automáticamente
  it('load_shouldCreatePersonalWorkspace_whenNoWorkspacesExist', fakeAsync(() => {
    // Primera llamada: vacía. Segunda (tras save): un workspace creado.
    workspaceServiceSpy.loadWorkspaces.and.returnValues(
      of({ workspaces: [], rowMap: {} }),
      of({ workspaces: [], rowMap: {} }),
    );
    workspaceServiceSpy.saveWorkspace.and.returnValue(of(undefined));

    service.load();
    flushMicrotasks();

    expect(workspaceServiceSpy.saveWorkspace).toHaveBeenCalledTimes(1);
    const savedWs = workspaceServiceSpy.saveWorkspace.calls.mostRecent().args[0];
    expect(savedWs.name).toBe('Personal');
    expect(savedWs.isDefault).toBeTrue();
  }));

  // REQ-02 sc4 — setActive() → activeWorkspaceId actualiza sin HTTP
  it('setActive_shouldUpdateActiveWorkspaceId_withoutHTTP', () => {
    service.setActive(MOCK_WORKSPACE_ID_B);

    expect(service.activeWorkspaceId()).toBe(MOCK_WORKSPACE_ID_B);
    expect(workspaceServiceSpy.loadWorkspaces).not.toHaveBeenCalled();
  });

  // REQ-08 sc1 — delete() en workspace default → no ejecuta deleteWorkspace
  it('delete_shouldNotDelete_whenWorkspaceIsDefault', fakeAsync(() => {
    workspaceServiceSpy.loadWorkspaces.and.returnValue(
      of({ workspaces: TWO_WS, rowMap: { [MOCK_WORKSPACE_ID_A]: 2 } }),
    );
    service.load();
    flushMicrotasks();

    service.delete(MOCK_WORKSPACE_ID_A, 2);
    flushMicrotasks();

    expect(workspaceServiceSpy.deleteWorkspace).not.toHaveBeenCalled();
    expect(service.items().length).toBe(2);
  }));

  // REQ-02 sc5 — load() con error de API → error() en lenguaje natural, no stack trace
  it('load_shouldSetError_whenLoadFails', fakeAsync(() => {
    workspaceServiceSpy.loadWorkspaces.and.returnValue(
      throwError(() => new Error('Network error')),
    );

    service.load();
    flushMicrotasks();

    expect(service.error()).not.toBeNull();
    expect(service.items().length).toBe(0);
    expect(service.loading()).toBeFalse();
  }));
});
