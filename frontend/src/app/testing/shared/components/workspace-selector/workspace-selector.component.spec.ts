import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { WorkspaceSelectorComponent } from '../../../../shared/components/workspace-selector/workspace-selector.component';
import { MOCK_WORKSPACES, MOCK_WORKSPACE_ID_A, MOCK_WORKSPACE_ID_B } from '../../../fixtures';

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceSelectorComponent — REQ-05
// ─────────────────────────────────────────────────────────────────────────────
describe('WorkspaceSelectorComponent', () => {
  let fixture: ComponentFixture<WorkspaceSelectorComponent>;
  let component: WorkspaceSelectorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceSelectorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('workspaces', MOCK_WORKSPACES);
    fixture.componentRef.setInput('activeId', MOCK_WORKSPACE_ID_A);
    fixture.detectChanges();
  });

  // REQ-05 sc1 — tab activo tiene clase border-b-2
  it('activeTab_shouldHaveBorderClass_whenActiveIdMatches', () => {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const activeButton = buttons.find(b =>
      b.nativeElement.textContent.includes(MOCK_WORKSPACES[0].name),
    );

    expect(activeButton).toBeDefined();
    expect(activeButton!.nativeElement.classList).toContain('border-b-2');
  });

  // REQ-05 sc2 — tab inactivo NO tiene clase border-b-2
  it('inactiveTab_shouldNotHaveBorderClass_whenNotActive', () => {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const inactiveButton = buttons.find(b =>
      b.nativeElement.textContent.includes(MOCK_WORKSPACES[1].name),
    );

    expect(inactiveButton).toBeDefined();
    expect(inactiveButton!.nativeElement.classList).not.toContain('border-b-2');
  });

  // REQ-05 sc3 — click en tab inactivo emite switched con el ID correcto
  it('click_onInactiveTab_shouldEmitSwitchedWithCorrectId', () => {
    const emittedIds: string[] = [];
    component.switched.subscribe((id: string) => emittedIds.push(id));

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const inactiveButton = buttons.find(b =>
      b.nativeElement.textContent.includes(MOCK_WORKSPACES[1].name),
    );
    inactiveButton!.nativeElement.click();
    fixture.detectChanges();

    expect(emittedIds.length).toBe(1);
    expect(emittedIds[0]).toBe(MOCK_WORKSPACE_ID_B);
  });

  // REQ-05 sc4 — click en "+ Nuevo" emite newRequested
  it('click_onNewButton_shouldEmitNewRequested', () => {
    let emitted = false;
    component.newRequested.subscribe(() => (emitted = true));

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const newButton = buttons.find(b =>
      b.nativeElement.textContent.includes('Nuevo'),
    );
    expect(newButton).toBeDefined();
    newButton!.nativeElement.click();
    fixture.detectChanges();

    expect(emitted).toBe(true);
  });
});
