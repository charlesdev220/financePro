import { createComponentFactory, Spectator, mockProvider } from '@ngneat/spectator/jest';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ModalController, ToastController } from '@ionic/angular/standalone';

import { WorkspaceFormComponent } from '../../../../features/workspaces/workspace-form/workspace-form.component';
import { WorkspacesStateService } from '../../../../core/state/workspaces.state';
import { CategoriesStateService } from '../../../../core/state/categories.state';
import { DataSeedService } from '../../../../core/services/data-seed.service';
import { AuthService } from '../../../../core/services/auth.service';
import { WORKSPACE_DEFAULTS } from '../../../../core/constants/workspace.constants';
import { MOCK_WORKSPACES } from '../../../fixtures';
import { MODAL_CONTROLLER_MOCK, TOAST_CONTROLLER_MOCK } from '../../../ionic-mocks';

describe('WorkspaceFormComponent', () => {
  let spectator: Spectator<WorkspaceFormComponent>;
  const createdWorkspace = { workspaceId: 'ws_new_001', name: 'X', icon: '🏠', color: WORKSPACE_DEFAULTS.COLOR };

  const createComponent = createComponentFactory({
    component: WorkspaceFormComponent,
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      mockProvider(CategoriesStateService),
      mockProvider(DataSeedService, {
        seedCategoriesForWorkspace: jest.fn().mockReturnValue(of(true)),
      }),
      mockProvider(AuthService, {
        getUser: jest.fn().mockReturnValue({ sub: 'usr_001', name: 'Test', email: 'test@test.com' }),
      }),
      mockProvider(ModalController, MODAL_CONTROLLER_MOCK),
      mockProvider(ToastController, TOAST_CONTROLLER_MOCK),
    ],
  });

  beforeEach(() => {
    spectator = createComponent({
      providers: [
        mockProvider(WorkspacesStateService, {
          create: jest.fn().mockResolvedValue(createdWorkspace),
          rename: jest.fn(),
        }),
      ]
    });
  });

  it('ngOnInit_shouldInitializeDefaultSignals_inCreateMode', () => {
    expect(spectator.component.name()).toBe('');
    expect(spectator.component.icon()).toBe(WORKSPACE_DEFAULTS.ICON);
    expect(spectator.component.isEditMode).toBe(false);
  });

  it('ngOnInit_shouldInitializeSignalsFromWorkspace_inEditMode', () => {
    const ws = MOCK_WORKSPACES[1];
    spectator = createComponent({
      props: {
        workspace: ws,
        rowNumber: 3
      }
    });

    expect(spectator.component.name()).toBe('Trabajo');
    expect(spectator.component.icon()).toBe('💼');
    expect(spectator.component.isEditMode).toBe(true);
  });

  it('onNameInput_shouldUpdateNameSignal', () => {
    spectator.component.onNameInput(new CustomEvent('ionInput', { detail: { value: 'Familia' } }));
    expect(spectator.component.name()).toBe('Familia');
  });

  it('isFormInvalid_shouldBeTrue_whenNameIsEmpty', () => {
    expect(spectator.component.isFormInvalid()).toBe(true);
  });

  it('isFormInvalid_shouldBeTrue_whenNameIsOnlySpaces', () => {
    spectator.component.onNameInput(new CustomEvent('ionInput', { detail: { value: '   ' } }));
    expect(spectator.component.isFormInvalid()).toBe(true);
  });

  it('isFormInvalid_shouldBeFalse_whenNameHasContent', () => {
    spectator.component.onNameInput(new CustomEvent('ionInput', { detail: { value: 'Trabajo' } }));
    expect(spectator.component.isFormInvalid()).toBe(false);
  });

  it('save_shouldNotCallCreate_whenFormIsInvalid', async () => {
    await spectator.component.save();
    expect(spectator.inject(WorkspacesStateService).create).not.toHaveBeenCalled();
  });

  it('save_shouldUseDefaultColor_whenCreating', async () => {
    spectator.component.onNameInput(new CustomEvent('ionInput', { detail: { value: 'Familia' } }));
    await spectator.component.save();

    expect(spectator.inject(WorkspacesStateService).create).toHaveBeenCalledWith(
      expect.objectContaining({ color: WORKSPACE_DEFAULTS.COLOR }),
    );
  });

  it('save_shouldPresentSuccessToast_inCreateMode', async () => {
    spectator.component.onNameInput(new CustomEvent('ionInput', { detail: { value: 'Trabajo' } }));
    await spectator.component.save();

    expect(spectator.inject(ToastController).create).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'success' }),
    );
  });

  it('save_shouldPresentToastEspacioActualizado_inEditMode', async () => {
    spectator = createComponent({
      props: {
        workspace: MOCK_WORKSPACES[0],
        rowNumber: 2
      }
    });
    spectator.component.onNameInput(new CustomEvent('ionInput', { detail: { value: 'Mi cuenta' } }));

    await spectator.component.save();

    expect(spectator.inject(ToastController).create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Espacio actualizado', color: 'success' }),
    );
  });

  it('save_shouldCallRename_andNotCreate_inEditMode', async () => {
    spectator = createComponent({
      props: {
        workspace: MOCK_WORKSPACES[0],
        rowNumber: 2
      }
    });
    spectator.component.onNameInput(new CustomEvent('ionInput', { detail: { value: 'Mi cuenta' } }));

    await spectator.component.save();

    expect(spectator.inject(WorkspacesStateService).rename).toHaveBeenCalledWith(
      MOCK_WORKSPACES[0].workspaceId, 'Mi cuenta', 2,
    );
    expect(spectator.inject(WorkspacesStateService).create).not.toHaveBeenCalled();
  });

  it('cancel_shouldDismissModal_withoutSideEffects', async () => {
    await spectator.component.cancel();
    expect(spectator.inject(ModalController).dismiss).toHaveBeenCalledTimes(1);
    expect(spectator.inject(WorkspacesStateService).create).not.toHaveBeenCalled();
  });

  it('component_shouldNotHaveFormGroupProperty', () => {
    expect((spectator.component as any).form).toBeUndefined();
  });
});
