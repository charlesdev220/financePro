import { ChangeDetectionStrategy, Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonListHeader, IonItem, IonLabel, IonInput,
  ModalController,
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
    ReactiveFormsModule,
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

  private readonly fb              = inject(FormBuilder);
  private readonly workspacesState = inject(WorkspacesStateService);
  private readonly authService     = inject(AuthService);
  private readonly modalCtrl       = inject(ModalController);

  form!: FormGroup;

  get isEditMode(): boolean { return !!this.workspace; }

  ngOnInit(): void {
    this.form = this.fb.group({
      name:  [this.workspace?.name  ?? '',                  Validators.required],
      icon:  [this.workspace?.icon  ?? WORKSPACE_DEFAULTS.ICON],
      color: [this.workspace?.color ?? WORKSPACE_DEFAULTS.COLOR],
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const { name, icon, color } = this.form.getRawValue();
    if (this.workspace && this.rowNumber) {
      this.workspacesState.rename(this.workspace.workspaceId, name.trim(), this.rowNumber);
    } else {
      const user = this.authService.getUser();
      if (!user) return;
      this.workspacesState.create({ userId: user.sub, name: name.trim(), icon, color, isDefault: false });
    }
    await this.modalCtrl.dismiss();
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}
