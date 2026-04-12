import { walletsReducer, WalletsState } from '../../../store/wallets/wallets.reducer';
import { WalletsActions } from '../../../store/wallets/wallets.actions';
import { MOCK_WALLETS } from '../../fixtures';

describe('walletsReducer', () => {
  const initialState: WalletsState = {
    items: [],
    loading: false,
    error: null,
  };

  it('returns the initial state for an unknown action', () => {
    const state = walletsReducer(undefined, { type: '@@INIT' } as any);
    expect(state).toEqual(initialState);
  });

  describe('loadWallets', () => {
    it('sets loading to true and clears previous error', () => {
      const prev: WalletsState = { items: [], loading: false, error: 'previous error' };
      const state = walletsReducer(prev, WalletsActions.loadWallets());
      expect(state.loading).toBeTrue();
      expect(state.error).toBeNull();
    });
  });

  describe('loadWalletsSuccess', () => {
    it('stores wallets and sets loading to false', () => {
      const prev: WalletsState = { items: [], loading: true, error: null };
      const state = walletsReducer(
        prev,
        WalletsActions.loadWalletsSuccess({ wallets: MOCK_WALLETS })
      );
      expect(state.items).toEqual(MOCK_WALLETS);
      expect(state.loading).toBeFalse();
    });

    it('identifies the default wallet in the returned items', () => {
      const state = walletsReducer(
        initialState,
        WalletsActions.loadWalletsSuccess({ wallets: MOCK_WALLETS })
      );
      const defaultWallet = state.items.find(w => w.isDefault);
      expect(defaultWallet).toBeDefined();
      expect(defaultWallet?.name).toBe('Efectivo');
    });
  });

  describe('loadWalletsFailure', () => {
    it('sets error and sets loading to false', () => {
      const prev: WalletsState = { items: [], loading: true, error: null };
      const state = walletsReducer(
        prev,
        WalletsActions.loadWalletsFailure({ error: 'Connection timeout' })
      );
      expect(state.error).toBe('Connection timeout');
      expect(state.loading).toBeFalse();
    });

    it('preserves existing wallets on failure', () => {
      const prev: WalletsState = { items: MOCK_WALLETS, loading: true, error: null };
      const state = walletsReducer(
        prev,
        WalletsActions.loadWalletsFailure({ error: 'Network error' })
      );
      expect(state.items).toEqual(MOCK_WALLETS);
    });
  });
});
