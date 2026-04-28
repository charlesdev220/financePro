import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IWorkspace } from '@models/workspace.model';

@Component({
  selector: 'app-workspace-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './workspace-selector.component.html',
})
export class WorkspaceSelectorComponent {
  /** Workspaces del usuario para renderizar los tabs. Usado por DashboardPage. */
  workspaces = input.required<IWorkspace[]>();
  /** ID del workspace activo. Usado por DashboardPage para marcar el tab activo. */
  activeId   = input.required<string>();
  /** Emite el ID cuando el usuario cambia de workspace. Escuchado por DashboardPage. */
  switched     = output<string>();
  /** Emite cuando el usuario pulsa el botón "+ Nuevo". Escuchado por DashboardPage. */
  newRequested = output<void>();

  onSwitch(id: string): void {
    this.switched.emit(id);
  }

  onNew(): void {
    this.newRequested.emit();
  }
}
