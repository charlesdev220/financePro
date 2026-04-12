import { budgetsReducer, BudgetsState } from '../../../store/budgets/budgets.reducer';
import { BudgetsActions } from '../../../store/budgets/budgets.actions';
import { MOCK_BUDGETS } from '../../fixtures';

describe('budgetsReducer', () => {
  const initialState: BudgetsState = {
    items: [],
    rowMap: {},
    loading: false,
    error: null,
  };

  it('returns the initial state for an unknown action', () => {
    const state = budgetsReducer(undefined, { type: '@@INIT' } as any);
    expect(state).toEqual(initialState);
  });

  describe('loadBudgets', () => {
    it('sets loading to true and clears previous error', () => {
      const prev: BudgetsState = { items: [], rowMap: {}, loading: false, error: 'previous error' };
      const state = budgetsReducer(prev, BudgetsActions.loadBudgets());
      expect(state.loading).toBeTrue();
      expect(state.error).toBeNull();
    });
  });

  describe('loadBudgetsSuccess', () => {
    it('stores budgets and sets loading to false', () => {
      const prev: BudgetsState = { items: [], rowMap: {}, loading: true, error: null };
      const state = budgetsReducer(
        prev,
        BudgetsActions.loadBudgetsSuccess({ budgets: MOCK_BUDGETS, rowMap: {} })
      );
      expect(state.items).toEqual(MOCK_BUDGETS);
      expect(state.loading).toBeFalse();
    });

    it('contains budgets with valid status values from fixture', () => {
      const state = budgetsReducer(
        initialState,
        BudgetsActions.loadBudgetsSuccess({ budgets: MOCK_BUDGETS, rowMap: {} })
      );
      state.items.forEach(b => {
        expect(['ok', 'warning', 'exceeded']).toContain(b.status);
      });
    });
  });

  describe('loadBudgetsFailure', () => {
    it('sets error and sets loading to false', () => {
      const prev: BudgetsState = { items: [], rowMap: {}, loading: true, error: null };
      const state = budgetsReducer(
        prev,
        BudgetsActions.loadBudgetsFailure({ error: 'Unauthorized' })
      );
      expect(state.error).toBe('Unauthorized');
      expect(state.loading).toBeFalse();
    });

    it('preserves existing budgets on failure', () => {
      const prev: BudgetsState = { items: MOCK_BUDGETS, rowMap: {}, loading: true, error: null };
      const state = budgetsReducer(
        prev,
        BudgetsActions.loadBudgetsFailure({ error: 'Network error' })
      );
      expect(state.items).toEqual(MOCK_BUDGETS);
    });
  });
});
