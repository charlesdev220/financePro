import { ICategory } from '@models/category.model';
import { APP_COLORS } from '@core/constants/colors.constants';

// CATEGORIES schema (A:K — 11 columnas)
// A: category_id | B: user_id | C: name | D: icon | E: color | F: type
// G: budget_amount | H: budget_period | I: is_active | J: created_at | K: workspace_id

export function rowToCategory(row: unknown[], defaultWsId = ''): ICategory {
  const budgetRaw = row[6];
  return {
    categoryId: String(row[0] ?? ''),
    userId: String(row[1] ?? ''),
    name: String(row[2] ?? ''),
    icon: String(row[3] ?? '📂'),
    color: String(row[4] ?? APP_COLORS.GRAY),
    type: (String(row[5] ?? 'expense') as 'income' | 'expense'),
    budgetAmount: budgetRaw ? Number(budgetRaw) : null,
    budgetPeriod: (String(row[7] ?? 'monthly') as 'monthly' | 'weekly' | 'custom'),
    isActive: row[8] === true || String(row[8] ?? 'true').toLowerCase() === 'true',
    createdAt: String(row[9] ?? new Date().toISOString()),
    workspaceId: String(row[10] ?? defaultWsId),
  };
}

export function categoryToRow(cat: ICategory): unknown[] {
  return [
    cat.categoryId,
    cat.userId,
    cat.name,
    cat.icon,
    cat.color,
    cat.type,
    cat.budgetAmount ?? '',
    cat.budgetPeriod,
    cat.isActive,
    cat.createdAt,
    cat.workspaceId,
  ];
}
