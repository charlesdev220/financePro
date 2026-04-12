import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IWallet } from '../../models/wallet.model';

export const WalletsActions = createActionGroup({
  source: 'Wallets',
  events: {
    'Load Wallets': emptyProps(),
    'Load Wallets Success': props<{ wallets: IWallet[]; rowMap: Record<string, number> }>(),
    'Load Wallets Failure': props<{ error: string }>(),

    'Add Wallet': props<{ wallet: IWallet }>(),
    'Add Wallet Success': props<{ wallet: IWallet }>(),
    'Add Wallet Failure': props<{ error: string; prevItems: IWallet[] }>(),

    'Update Wallet': props<{ wallet: IWallet; rowNumber: number }>(),
    'Update Wallet Success': props<{ wallet: IWallet }>(),
    'Update Wallet Failure': props<{ error: string; prevItems: IWallet[] }>(),

    'Delete Wallet': props<{ walletId: string; rowNumber: number }>(),
    'Delete Wallet Success': props<{ walletId: string }>(),
    'Delete Wallet Failure': props<{ error: string; prevItems: IWallet[] }>(),
  },
});
