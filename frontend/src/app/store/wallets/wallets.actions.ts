import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IWallet } from '../../models/wallet.model';

export const WalletsActions = createActionGroup({
  source: 'Wallets',
  events: {
    'Load Wallets': emptyProps(),
    'Load Wallets Success': props<{ wallets: IWallet[] }>(),
    'Load Wallets Failure': props<{ error: string }>(),
  },
});
