export interface ICategory {
  categoryId: string;
  userId: string;
  name: string;
  icon: string;
  color: string; // hex color, e.g. '#4CAF50'
  type: 'income' | 'expense';
  budgetAmount: number | null;
  budgetPeriod: 'monthly' | 'weekly' | 'custom';
  isActive: boolean;
  createdAt: string; // ISO 8601 timestamp
}
