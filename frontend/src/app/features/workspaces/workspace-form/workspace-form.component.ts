import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonListHeader, IonItem, IonLabel, IonInput,
  ModalController, ToastController,
} from '@ionic/angular/standalone';
import { IWorkspace } from '@models/workspace.model';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { AuthService } from '@core/services/auth.service';
import { WORKSPACE_DEFAULTS } from '@core/constants/workspace.constants';

@Component({
  selector: 'app-workspace-form',
  templateUrl: './workspace-form.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonListHeader, IonItem, IonLabel, IonInput,
  ],
})
export class WorkspaceFormComponent implements OnInit {
  /**
   * Excepción arquitectónica: se usa @Input() legacy.
   * Motivo: Ionic ModalController.create({ componentProps }) asigna props directamente
   * sobre la instancia sin pasar por el mecanismo de Angular signals.
   */
  @Input() workspace?: IWorkspace;
  @Input() rowNumber?: number;

  private readonly workspacesState = inject(WorkspacesStateService);
  private readonly authService     = inject(AuthService);
  private readonly modalCtrl       = inject(ModalController);
  private readonly toastCtrl       = inject(ToastController);

  readonly name = signal<string>('');
  readonly icon = signal<string>(WORKSPACE_DEFAULTS.ICON);

  /** Verdadero si name está vacío o contiene solo espacios. Deshabilita el botón de acción. */
  readonly isFormInvalid = computed(() => this.name().trim().length === 0);

  get isEditMode(): boolean { return !!this.workspace; }

  ngOnInit(): void {
    this.name.set(this.workspace?.name ?? '');
    this.icon.set(this.workspace?.icon ?? WORKSPACE_DEFAULTS.ICON);
  }

  onNameInput(event: CustomEvent): void {
    this.name.set(event.detail.value ?? '');
  }

  onIconInput(event: CustomEvent): void {
    this.icon.set(event.detail.value ?? WORKSPACE_DEFAULTS.ICON);
  }

  async save(): Promise<void> {
    if (this.isFormInvalid()) return;
    const name = this.name().trim();
    const icon = this.icon();
    if (this.workspace && this.rowNumber) {
      this.workspacesState.rename(this.workspace.workspaceId, name, this.rowNumber);
    } else {
      const user = this.authService.getUser();
      if (!user) return;
      this.workspacesState.create({
        userId:    user.sub,
        name,
        icon,
        color:     WORKSPACE_DEFAULTS.COLOR,
        isDefault: false,
      });
    }
    const toast = await this.toastCtrl.create({
      message:  this.isEditMode ? 'Espacio actualizado' : 'Espacio creado',
      color:    'success',
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
    await this.modalCtrl.dismiss();
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}
