export interface IWallet {
  walletId: string;
  userId: string;
  name: string;
  currency: string; // ISO 4217 code, e.g. 'EUR'
  balance: number;
  color: string; // hex color
  icon: string;
  isDefault: boolean;
  createdAt: string; // ISO 8601 timestamp
}
