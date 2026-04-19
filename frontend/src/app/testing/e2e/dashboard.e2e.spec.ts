import { test, expect } from '@playwright/test';
import { setupAndNavigate } from './helpers/auth-helpers';
import { buildMockTransactions, buildMockCategories, buildMockWallets, buildMockBudgets, buildMockUsers } from './helpers/mock-data';

const CURRENT_PERIOD = new Date().toISOString().slice(0, 7);

const BASE_DATA = {
  transactions: buildMockTransactions(6),
  categories: buildMockCategories(),
  wallets: buildMockWallets(),
  users: buildMockUsers(),
};

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-04: Sin errores críticos de consola
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Dashboard — sin errores críticos (REQ-E2E-04)', () => {

  test('sc1: carga /dashboard sin NullInjector ni ExpressionChanged', async ({ page }) => {
    const criticalErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') criticalErrors.push(msg.text());
    });

    await setupAndNavigate(page, '/tabs/dashboard', {
      ...BASE_DATA,
      budgets: buildMockBudgets(CURRENT_PERIOD),
    });

    const blocking = criticalErrors.filter(e =>
      e.includes('NullInjector') ||
      e.includes('ExpressionChangedAfterItHasBeenCheckedError'),
    );
    expect(blocking).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-05: Summary y chart visibles
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Dashboard — summary y chart (REQ-E2E-05)', () => {

  test('sc1: app-dashboard-summary visible con datos', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/dashboard', {
      ...BASE_DATA,
      budgets: buildMockBudgets(CURRENT_PERIOD),
    });

    await expect(page.locator('app-dashboard-summary')).toBeVisible({ timeout: 8000 });
  });

  test('sc2: canvas del doughnut chart visible', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/dashboard', {
      ...BASE_DATA,
      budgets: buildMockBudgets(CURRENT_PERIOD),
    });

    const canvas = page.locator('app-dashboard-chart canvas');
    await expect(canvas).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-06: exceeded-banner
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Dashboard — exceeded-banner (REQ-E2E-06)', () => {

  test('sc1: banner visible cuando hay presupuesto excedido', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/dashboard', {
      ...BASE_DATA,
      budgets: buildMockBudgets(CURRENT_PERIOD, { includeExceeded: true }),
    });

    const banner = page.locator('.exceeded-banner');
    await expect(banner).toBeVisible({ timeout: 8000 });
    await expect(banner).toContainText('superaron su presupuesto');
  });

  test('sc2: banner no visible cuando todos los presupuestos están ok', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/dashboard', {
      ...BASE_DATA,
      budgets: buildMockBudgets(CURRENT_PERIOD, { includeExceeded: false }),
    });

    await expect(page.locator('.exceeded-banner')).not.toBeVisible();
  });
});
