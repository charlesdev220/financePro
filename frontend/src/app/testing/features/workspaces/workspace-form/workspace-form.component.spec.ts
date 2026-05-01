import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModalController, ToastController } from '@ionic/angular/standalone';

import { WorkspaceFormComponent } from '../../../../features/workspaces/workspace-form/workspace-form.component';
import { WorkspacesStateService } from '../../../../core/state/workspaces.state';
import { AuthService } from '../../../../core/services/auth.service';
import { WORKSPACE_DEFAULTS } from '../../../../core/constants/workspace.constants';
import { MOCK_WORKSPACES } from '../../../fixtures';

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceFormComponent — REQ-01, REQ-02, REQ-03, REQ-04, REQ-06, REQ-07
// ─────────────────────────────────────────────────────────────────────────────
describe('WorkspaceFormComponent', () => {
  let fixture: ComponentFixture<WorkspaceFormComponent>;
  let component: WorkspaceFormComponent;
  let workspacesStateSpy: { create: jest.Mock; rename: jest.Mock };
  let authServiceSpy:     { getUser: jest.Mock };
  let modalCtrlSpy:       { dismiss: jest.Mock };
  let toastCtrlSpy:       { create: jest.Mock };
  let toastSpy:           { present: jest.Mock };

  beforeEach(async () => {
    workspacesStateSpy = { create: jest.fn(), rename: jest.fn() };
    authServiceSpy     = { getUser: jest.fn() };
    modalCtrlSpy       = { dismiss: jest.fn() };
    toastSpy           = { present: jest.fn() };
    toastCtrlSpy       = { create: jest.fn() };

    authServiceSpy.getUser.mockReturnValue({ sub: 'usr_001', name: 'Test', email: 'test@test.com' });
    modalCtrlSpy.dismiss.mockResolvedValue(true);
    toastSpy.present.mockResolvedValue(undefined);
    toastCtrlSpy.create.mockResolvedValue(toastSpy);

    await TestBed.configureTestingModule({
      imports: [WorkspaceFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WorkspacesStateService, useValue: workspacesStateSpy },
        { provide: AuthService,            useValue: authServiceSpy },
        { provide: ModalController,        useValue: modalCtrlSpy },
        { provide: ToastController,        useValue: toastCtrlSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(WorkspaceFormComponent);
    component = fixture.componentInstance;
  });

  // ── REQ-01: Renderizado inicial ───────────────────────────────────────────

  // REQ-01 sc1 — modo creación: signals inicializados con valores por defecto
  it('ngOnInit_shouldInitializeDefaultSignals_inCreateMode', () => {
    fixture.detectChanges();

    expect(component.name()).toBe('');
    expect(component.icon()).toBe(WORKSPACE_DEFAULTS.ICON);
    expect(component.isEditMode).toBe(false);
  });

  // REQ-01 sc2 — modo edición: signals inicializados desde @Input workspace
  it('ngOnInit_shouldInitializeSignalsFromWorkspace_inEditMode', () => {
    const ws = MOCK_WORKSPACES[1];
    component.workspace = ws;
    component.rowNumber = 3;
    fixture.detectChanges();

    expect(component.name()).toBe('Trabajo');
    expect(component.icon()).toBe('💼');
    expect(component.isEditMode).toBe(true);
  });

  // REQ-01 sc3 — onNameInput actualiza el signal name
  it('onNameInput_shouldUpdateNameSignal', () => {
    fixture.detectChanges();
    component.onNameInput(new CustomEvent('ionInput', { detail: { value: 'Familia' } }));
    expect(component.name()).toBe('Familia');
  });

  // ── REQ-02: Validación ────────────────────────────────────────────────────

  // REQ-02 sc1 — isFormInvalid true cuando name está vacío
  it('isFormInvalid_shouldBeTrue_whenNameIsEmpty', () => {
    fixture.detectChanges();
    expect(component.isFormInvalid()).toBe(true);
  });

  // REQ-02 sc2 — isFormInvalid true cuando name tiene solo espacios
  it('isFormInvalid_shouldBeTrue_whenNameIsOnlySpaces', () => {
    fixture.detectChanges();
    component.onNameInput(new CustomEvent('ionInput', { detail: { value: '   ' } }));
    expect(component.isFormInvalid()).toBe(true);
  });

  // REQ-02 sc3 — isFormInvalid false cuando name tiene contenido válido
  it('isFormInvalid_shouldBeFalse_whenNameHasContent', () => {
    fixture.detectChanges();
    component.onNameInput(new CustomEvent('ionInput', { detail: { value: 'Trabajo' } }));
    expect(component.isFormInvalid()).toBe(false);
  });

  // REQ-02 edge — save() no llama create() si isFormInvalid es true
  it('save_shouldNotCallCreate_whenFormIsInvalid', async () => {
    fixture.detectChanges();
    await component.save();

    expect(workspacesStateSpy.create).not.toHaveBeenCalled();
    expect(toastCtrlSpy.create).not.toHaveBeenCalled();
  });

  // ── REQ-03: Color por defecto ─────────────────────────────────────────────

  // REQ-03 sc2 — save() incluye color: WORKSPACE_DEFAULTS.COLOR en el draft
  it('save_shouldUseDefaultColor_whenCreating', async () => {
    fixture.detectChanges();
    component.onNameInput(new CustomEvent('ionInput', { detail: { value: 'Familia' } }));

    await component.save();

    expect(workspacesStateSpy.create).toHaveBeenCalledWith(
      expect.objectContaining({ color: WORKSPACE_DEFAULTS.COLOR }),
    );
  });

  // ── REQ-04: Toast de confirmación ────────────────────────────────────────

  // REQ-04 sc1 — toast 'Espacio creado' en modo creación
  it('save_shouldPresentToastEspacioCreado_inCreateMode', async () => {
    fixture.detectChanges();
    component.onNameInput(new CustomEvent('ionInput', { detail: { value: 'Trabajo' } }));

    await component.save();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Espacio creado', color: 'success' }),
    );
    expect(toastSpy.present).toHaveBeenCalled();
  });

  // REQ-04 sc2 — toast 'Espacio actualizado' en modo edición
  it('save_shouldPresentToastEspacioActualizado_inEditMode', async () => {
    component.workspace = MOCK_WORKSPACES[0];
    component.rowNumber = 2;
    fixture.detectChanges();
    component.onNameInput(new CustomEvent('ionInput', { detail: { value: 'Mi cuenta' } }));

    await component.save();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Espacio actualizado', color: 'success' }),
    );
  });

  // ── REQ-06: Flujo de renombrado ───────────────────────────────────────────

  // REQ-06 sc1 — save() llama rename() y NO create() en modo edición
  it('save_shouldCallRename_andNotCreate_inEditMode', async () => {
    component.workspace = MOCK_WORKSPACES[0];
    component.rowNumber = 2;
    fixture.detectChanges();
    component.onNameInput(new CustomEvent('ionInput', { detail: { value: 'Mi cuenta' } }));

    await component.save();

    expect(workspacesStateSpy.rename).toHaveBeenCalledWith(
      MOCK_WORKSPACES[0].workspaceId, 'Mi cuenta', 2,
    );
    expect(workspacesStateSpy.create).not.toHaveBeenCalled();
  });

  // REQ-06 sc2 — cancel() llama dismiss() sin side effects
  it('cancel_shouldDismissModal_withoutSideEffects', async () => {
    fixture.detectChanges();

    await component.cancel();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledTimes(1);
    expect(workspacesStateSpy.create).not.toHaveBeenCalled();
    expect(workspacesStateSpy.rename).not.toHaveBeenCalled();
    expect(toastCtrlSpy.create).not.toHaveBeenCalled();
  });

  // ── REQ-07: Sin ReactiveFormsModule ──────────────────────────────────────

  // REQ-07 — el componente no tiene FormGroup en su definición
  it('component_shouldNotHaveFormGroupProperty', () => {
    fixture.detectChanges();
    expect((component as any).form).toBeUndefined();
    expect((component as any).fb).toBeUndefined();
  });
});
