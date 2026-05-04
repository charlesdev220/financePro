import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { WorkspaceSelectorComponent } from '@shared/components/workspace-selector/workspace-selector.component';
import { MOCK_WORKSPACES, MOCK_WORKSPACE_ID_A, MOCK_WORKSPACE_ID_B } from '../../../fixtures';

describe('WorkspaceSelectorComponent', () => {
  let spectator: Spectator<WorkspaceSelectorComponent>;

  const createComponent = createComponentFactory({
    component: WorkspaceSelectorComponent,
  });

  beforeEach(() => {
    spectator = createComponent({
      props: {
        workspaces: MOCK_WORKSPACES,
        activeId: MOCK_WORKSPACE_ID_A
      }
    });
  });

  it('activeTab_shouldHaveBorderClass_whenActiveIdMatches', () => {
    const activeButton = spectator.queryAll('button').find(b =>
      b.textContent?.includes(MOCK_WORKSPACES[0].name),
    );

    expect(activeButton).toBeDefined();
    expect(activeButton?.classList).toContain('border-b-2');
  });

  it('inactiveTab_shouldNotHaveBorderClass_whenNotActive', () => {
    const inactiveButton = spectator.queryAll('button').find(b =>
      b.textContent?.includes(MOCK_WORKSPACES[1].name),
    );

    expect(inactiveButton).toBeDefined();
    expect(inactiveButton?.classList).not.toContain('border-b-2');
  });

  it('click_onInactiveTab_shouldEmitSwitchedWithCorrectId', () => {
    let emittedId: string | undefined;
    spectator.component.switched.subscribe((id: string) => emittedId = id);

    const inactiveButton = spectator.queryAll('button').find(b =>
      b.textContent?.includes(MOCK_WORKSPACES[1].name),
    );
    spectator.click(inactiveButton!);

    expect(emittedId).toBe(MOCK_WORKSPACE_ID_B);
  });

  it('click_onNewButton_shouldEmitNewRequested', () => {
    let emitted = false;
    spectator.component.newRequested.subscribe(() => (emitted = true));

    const newButton = spectator.queryAll('button').find(b =>
      b.textContent?.includes('Nuevo'),
    );
    expect(newButton).toBeDefined();
    spectator.click(newButton!);

    expect(emitted).toBe(true);
  });
});
