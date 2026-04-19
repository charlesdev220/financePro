# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/wallets.e2e.spec.ts >> Wallet List — estado vacío (REQ-E2E-11) >> sc1: sin carteras → mensaje de estado vacío visible
- Location: src/app/testing/e2e/wallets.e2e.spec.ts:12:7

# Error details

```
Error: page.goto: Target page, context or browser has been closed
```

# Test source

```ts
  1  | import { Page } from '@playwright/test';
  2  | 
  3  | export const MOCK_USER = {
  4  |   sub: 'test-user-001',
  5  |   email: 'test@myfinance.dev',
  6  |   name: 'Test User',
  7  | };
  8  | 
  9  | export interface MockSheetData {
  10 |   transactions?: string[][];
  11 |   categories?: string[][];
  12 |   wallets?: string[][];
  13 |   budgets?: string[][];
  14 |   users?: string[][];
  15 | }
  16 | 
  17 | const SHEETS_HEADERS: Record<string, string[]> = {
  18 |   TRANSACTIONS: ['tx_id','user_id','wallet_id','category_id','amount','currency','amount_base','concept','date','type','is_recurring','recurrence_rule','notes','created_at','updated_at'],
  19 |   CATEGORIES:   ['category_id','user_id','name','icon','color','type','budget_amount','budget_period','is_active','created_at'],
  20 |   WALLETS:      ['wallet_id','user_id','name','currency','balance','icon','is_default','created_at'],
  21 |   BUDGETS:      ['budget_id','user_id','category_id','period','budget_amount','spent_amount','status','last_updated'],
  22 |   USERS:        ['user_id','email_hash','email_enc','display_name_enc','password_hash','currency','period_start','created_at'],
  23 | };
  24 | 
  25 | export async function injectAuthSession(page: Page, user = MOCK_USER): Promise<void> {
  26 |   await page.addInitScript((u) => {
  27 |     localStorage.setItem('myfinance_user', JSON.stringify(u));
  28 |   }, user);
  29 | }
  30 | 
  31 | export async function mockOAuthToken(page: Page): Promise<void> {
  32 |   await page.route('https://oauth2.googleapis.com/token', route => {
  33 |     route.fulfill({
  34 |       status: 200,
  35 |       contentType: 'application/json',
  36 |       body: JSON.stringify({ access_token: 'mock-token', expires_in: 3600, token_type: 'Bearer' }),
  37 |     });
  38 |   });
  39 | }
  40 | 
  41 | export async function mockSheetsApi(page: Page, data: MockSheetData): Promise<void> {
  42 |   await page.route('**/spreadsheets/**/values**', route => {
  43 |     const url = route.request().url();
  44 | 
  45 |     const sheetKey = (Object.keys(SHEETS_HEADERS) as Array<keyof typeof SHEETS_HEADERS>)
  46 |       .find(k => url.includes(k));
  47 | 
  48 |     if (!sheetKey) {
  49 |       route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ values: [] }) });
  50 |       return;
  51 |     }
  52 | 
  53 |     const dataKey = sheetKey.toLowerCase() as keyof MockSheetData;
  54 |     const providedRows = data[dataKey];
  55 | 
  56 |     if (providedRows) {
  57 |       // Caller provee filas completas (con headers) — pasar tal cual
  58 |       route.fulfill({
  59 |         status: 200,
  60 |         contentType: 'application/json',
  61 |         body: JSON.stringify({ values: providedRows }),
  62 |       });
  63 |     } else {
  64 |       // Hoja no especificada → solo headers, sin datos
  65 |       route.fulfill({
  66 |         status: 200,
  67 |         contentType: 'application/json',
  68 |         body: JSON.stringify({ values: [SHEETS_HEADERS[sheetKey]] }),
  69 |       });
  70 |     }
  71 |   });
  72 | }
  73 | 
  74 | export async function setupAndNavigate(
  75 |   page: Page,
  76 |   path: string,
  77 |   data: MockSheetData,
  78 |   user = MOCK_USER,
  79 | ): Promise<void> {
  80 |   await injectAuthSession(page, user);
  81 |   await mockOAuthToken(page);
  82 |   await mockSheetsApi(page, data);
> 83 |   await page.goto(path);
     |              ^ Error: page.goto: Target page, context or browser has been closed
  84 |   await page.waitForLoadState('networkidle');
  85 |   await page.waitForTimeout(3000);
  86 | }
  87 | 
```