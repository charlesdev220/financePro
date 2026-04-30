import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IWorkspace, WorkspaceDraft } from '@models/workspace.model';
import { WorkspaceService } from '@features/workspaces/services/workspace.service';
import { AuthService } from '@core/services/auth.service';
import { WORKSPACE_DEFAULTS } from '@core/constants/workspace.constants';

@Injectable({ providedIn: 'root' })
export class WorkspacesStateService {
  private readonly workspaceService = inject(WorkspaceService);
  private readonly authService      = inject(AuthService);

  private readonly _allItems          = signal<IWorkspace[]>([]);
  private readonly _activeWorkspaceId = signal<string>('');
  private readonly _loading           = signal<boolean>(false);
  private readonly _error             = signal<string | null>(null);
  private readonly _rowMap            = signal<Record<string, number>>({});

  /** Todos los workspaces del usuario. */
  readonly items             = this._allItems.asReadonly();
  readonly activeWorkspaceId = this._activeWorkspaceId.asReadonly();
  readonly loading           = this._loading.asReadonly();
  readonly error             = this._error.asReadonly();
  readonly rowMap            = this._rowMap.asReadonly();

  /** workspaceId del workspace marcado como default. */
  readonly defaultWorkspaceId = computed(
    () => this._allItems().find(ws => ws.isDefault)?.workspaceId ?? '',
  );

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    firstValueFrom(this.workspaceService.loadWorkspaces())
      .then(({ workspaces, rowMap }) => {
        if (workspaces.length === 0) {
          return this._createDefault();
        }
        this._allItems.set(workspaces);
        this._rowMap.set(rowMap);
        // Solo resetear si no hay workspace activo o si el activo fue eliminado
        const currentActive = this._activeWorkspaceId();
        const activeExists  = workspaces.some(ws => ws.workspaceId === currentActive);
        if (!currentActive || !activeExists) {
          const defaultWs = workspaces.find(ws => ws.isDefault) ?? workspaces[0];
          this._activeWorkspaceId.set(defaultWs.workspaceId);
        }
        return;
      })
      .catch(err => this._error.set(String(err)))
      .finally(() => this._loading.set(false));
  }

  setActive(id: string): void {
    this._activeWorkspaceId.set(id);
  }

  create(draft: WorkspaceDraft): void {
    const newWs: IWorkspace = {
      ...draft,
      workspaceId: `ws_${crypto.randomUUID()}`,
      createdAt:   new Date().toISOString(),
    };
    const prevItems = this._allItems();
    this._allItems.update(items => [...items, newWs]);
    this.setActive(newWs.workspaceId);
    firstValueFrom(this.workspaceService.saveWorkspace(newWs))
      .then(() => this.load())
      .catch(err => {
        // Rollback de _allItems. activeWorkspaceId queda en el ID fallido
        // hasta la próxima load(), donde el guard !activeExists lo corrige.
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }

  rename(workspaceId: string, name: string, rowNumber: number): void {
    const prevItems = this._allItems();
    const ws = prevItems.find(w => w.workspaceId === workspaceId);
    if (!ws) return;
    const updated: IWorkspace = { ...ws, name };
    this._allItems.update(items =>
      items.map(w => w.workspaceId === workspaceId ? updated : w),
    );
    firstValueFrom(this.workspaceService.updateWorkspace(updated, rowNumber))
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }

  delete(workspaceId: string, rowNumber: number): void {
    const ws = this._allItems().find(w => w.workspaceId === workspaceId);
    if (!ws || ws.isDefault) return; // guardia: no eliminar el default
    const prevItems = this._allItems();
    this._allItems.update(items => items.filter(w => w.workspaceId !== workspaceId));
    firstValueFrom(this.workspaceService.deleteWorkspace(rowNumber))
      .catch(err => {
        this._allItems.set(prevItems);
        this._error.set(String(err));
      });
  }

  private _createDefault(): Promise<void> {
    const newWs: IWorkspace = {
      workspaceId: `ws_${crypto.randomUUID()}`,
      userId:      this.authService.getUser()?.sub ?? '',
      name:        WORKSPACE_DEFAULTS.NAME,
      icon:        WORKSPACE_DEFAULTS.ICON,
      color:       WORKSPACE_DEFAULTS.COLOR,
      createdAt:   new Date().toISOString(),
      isDefault:   true,
    };
    this._allItems.set([newWs]);
    this._activeWorkspaceId.set(newWs.workspaceId);
    return firstValueFrom(this.workspaceService.saveWorkspace(newWs))
      .then(() => this.load());
  }
}
