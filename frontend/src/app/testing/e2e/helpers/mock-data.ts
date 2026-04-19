import { MOCK_USER } from './auth-helpers';

const NOW = new Date();

function monthLabel(offset: number): string {
  const d = new Date(NOW.getFullYear(), NOW.getMonth() - offset, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ─── USERS ───────────────────────────────────────────────────────────────────

export function buildMockUsers(): string[][] {
  return [
    ['user_id', 'email_hash', 'email_enc', 'display_name_enc', 'password_hash', 'currency', 'period_start', 'created_at'],
  ];
}

// ─── CATEGORIES ──────────────────────────────────────────────────────────────
// schema: category_id | user_id | name | icon | color | type | budget_amount | budget_period | is_active | created_at

export function buildMockCategories(): string[][] {
  return [
    ['category_id', 'user_id', 'name', 'icon', 'color', 'type', 'budget_amount', 'budget_period', 'is_active', 'created_at'],
    ['cat-001', MOCK_USER.sub, 'Salario',   '💰', '#4CAF50', 'income',  '',    'monthly', 'true', '2026-01-01T00:00:00Z'],
    ['cat-002', MOCK_USER.sub, 'Alquiler',  '🏠', '#F44336', 'expense', '800', 'monthly', 'true', '2026-01-01T00:00:00Z'],
    ['cat-003', MOCK_USER.sub, 'Comida',    '🍔', '#FF9800', 'expense', '300', 'monthly', 'true', '2026-01-01T00:00:00Z'],
  ];
}

// ─── WALLETS ─────────────────────────────────────────────────────────────────
// schema: wallet_id | user_id | name | currency | balance | icon | is_default | created_at

export function buildMockWallets(): string[][] {
  return [
    ['wallet_id', 'user_id', 'name', 'currency', 'balance', 'icon', 'is_default', 'created_at'],
    ['wal-001', MOCK_USER.sub, 'Efectivo',   'USD', '0', '💵', 'true',  '2026-01-01T00:00:00Z'],
    ['wal-002', MOCK_USER.sub, 'Banco',      'EUR', '0', '🏦', 'false', '2026-01-01T00:00:00Z'],
  ];
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
// schema: tx_id | user_id | wallet_id | category_id | amount | currency |
//         amount_base | concept | date | type | is_recurring | recurrence_rule | notes | created_at | updated_at

function buildTxRow(
  id: string,
  type: 'income' | 'expense',
  amount: number,
  date: string,
  concept: string,
  recurring: string,
  catId: string,
): string[] {
  return [
    id, MOCK_USER.sub, 'wal-001', catId,
    String(amount), 'USD', String(amount),
    concept, date, type, recurring, '', '',
    `${date}T00:00:00Z`, `${date}T00:00:00Z`,
  ];
}

export function buildMockTransactions(months = 6): string[][] {
  const headers = [
    'tx_id', 'user_id', 'wallet_id', 'category_id', 'amount', 'currency',
    'amount_base', 'concept', 'date', 'type', 'is_recurring', 'recurrence_rule',
    'notes', 'created_at', 'updated_at',
  ];
  const rows: string[][] = [headers];
  for (let i = 0; i < months; i++) {
    const m = monthLabel(months - 1 - i);
    rows.push(buildTxRow(`tx-inc-${i}`,  'income',  1500, `${m}-01`, 'Salario',      'true',  'cat-001'));
    rows.push(buildTxRow(`tx-exp-${i}`,  'expense',  600, `${m}-05`, 'Alquiler',     'true',  'cat-002'));
    rows.push(buildTxRow(`tx-food-${i}`, 'expense',  200, `${m}-10`, 'Supermercado', 'false', 'cat-003'));
  }
  return rows;
}

export function buildMockTransactionsTwoMonths(): string[][] {
  const headers = [
    'tx_id', 'user_id', 'wallet_id', 'category_id', 'amount', 'currency',
    'amount_base', 'concept', 'date', 'type', 'is_recurring', 'recurrence_rule',
    'notes', 'created_at', 'updated_at',
  ];
  const m0 = monthLabel(1);
  const m1 = monthLabel(0);
  return [
    headers,
    buildTxRow('tx-1', 'income',  1500, `${m0}-01`, 'Salario', 'true', 'cat-001'),
    buildTxRow('tx-2', 'expense',  600, `${m0}-05`, 'Alquiler', 'true', 'cat-002'),
    buildTxRow('tx-3', 'income',  1500, `${m1}-01`, 'Salario', 'true', 'cat-001'),
    buildTxRow('tx-4', 'expense',  600, `${m1}-05`, 'Alquiler', 'true', 'cat-002'),
  ];
}

// ─── BUDGETS ──────────────────────────────────────────────────────────────────
// schema: budget_id | user_id | category_id | period | budget_amount | spent_amount | status | last_updated

export function buildMockBudgets(
  period: string,
  opts: { includeExceeded?: boolean } = {},
): string[][] {
  const headers = ['budget_id', 'user_id', 'category_id', 'period', 'budget_amount', 'spent_amount', 'status', 'last_updated'];
  const rows: string[][] = [headers];

  rows.push(['bud-001', MOCK_USER.sub, 'cat-002', period, '800', '450', 'ok',      `${period}-01T00:00:00Z`]);
  rows.push(['bud-002', MOCK_USER.sub, 'cat-003', period, '300', '250', 'warning', `${period}-01T00:00:00Z`]);

  if (opts.includeExceeded) {
    rows.push(['bud-003', MOCK_USER.sub, 'cat-001', period, '500', '650', 'exceeded', `${period}-01T00:00:00Z`]);
  }

  return rows;
}
