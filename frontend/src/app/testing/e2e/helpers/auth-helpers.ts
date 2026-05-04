import { Page } from '@playwright/test';

export const MOCK_USER = {
  sub: 'test-user-001',
  email: 'test@myfinance.dev',
  name: 'Test User',
};

export interface MockSheetData {
  transactions?: string[][];
  categories?: string[][];
  wallets?: string[][];
  budgets?: string[][];
  users?: string[][];
}

const SHEETS_HEADERS: Record<string, string[]> = {
  TRANSACTIONS: ['tx_id','user_id','wallet_id','category_id','amount','currency','amount_base','concept','date','type','is_recurring','recurrence_rule','notes','created_at','updated_at'],
  CATEGORIES:   ['category_id','user_id','name','icon','color','type','budget_amount','budget_period','is_active','created_at'],
  WALLETS:      ['wallet_id','user_id','name','currency','balance','icon','is_default','created_at'],
  BUDGETS:      ['budget_id','user_id','category_id','period','budget_amount','spent_amount','status','last_updated'],
  USERS:        ['user_id','email_hash','email_enc','display_name_enc','password_hash','currency','period_start','created_at'],
};

export async function injectAuthSession(page: Page, user = MOCK_USER): Promise<void> {
  await page.addInitScript((u) => {
    localStorage.setItem('myfinance_user', JSON.stringify(u));
  }, user);
}

export async function mockOAuthToken(page: Page): Promise<void> {
  await page.route('https://oauth2.googleapis.com/token', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'mock-token', expires_in: 3600, token_type: 'Bearer' }),
    });
  });
}

export async function mockSheetsApi(page: Page, data: MockSheetData): Promise<void> {
  await page.route('**/spreadsheets/**/values**', route => {
    const url = route.request().url();

    const sheetKey = (Object.keys(SHEETS_HEADERS) as Array<keyof typeof SHEETS_HEADERS>)
      .find(k => url.includes(k));

    if (!sheetKey) {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ values: [] }) });
      return;
    }

    const dataKey = sheetKey.toLowerCase() as keyof MockSheetData;
    const providedRows = data[dataKey];

    if (providedRows) {
      // Caller provee filas completas (con headers) — pasar tal cual
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ values: providedRows }),
      });
    } else {
      // Hoja no especificada → solo headers, sin datos
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ values: [SHEETS_HEADERS[sheetKey]] }),
      });
    }
  });
}

export async function setupAndNavigate(
  page: Page,
  path: string,
  data: MockSheetData,
  user = MOCK_USER,
): Promise<void> {
  await injectAuthSession(page, user);
  await mockOAuthToken(page);
  await mockSheetsApi(page, data);
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
}
