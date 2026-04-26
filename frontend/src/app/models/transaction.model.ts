/** Campos que ingresa el usuario; txId/amountBase/createdAt/updatedAt los genera el State Service. */
export type TransactionDraft = Omit<ITransaction, 'txId' | 'amountBase' | 'createdAt' | 'updatedAt'>;

export interface ITransaction {
  txId: string;
  userId: string;
  walletId: string;
  categoryId: string;
  amount: number;
  currency: string;
  amountBase: number;
  concept: string;
  date: string; // ISO 8601 date: YYYY-MM-DD
  type: 'income' | 'expense';
  isRecurring: boolean;
  recurrenceRule: string | null;
  notes: string | null;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  
  // Presentation fields (Joined in UI)
  categoryName?: string;
  categoryIcon?: string;
}
