import { test, expect } from '@playwright/test';
import { setupAndNavigate } from './helpers/auth-helpers';
import { buildMockTransactions, buildMockCategories, buildMockWallets, buildMockUsers } from './helpers/mock-data';

const BASE = {
  categories: buildMockCategories(),
  wallets: buildMockWallets(),
  users: buildMockUsers(),
};

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-07: estado vacío
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Transaction List — estado vacío (REQ-E2E-07)', () => {

  test('sc1: sin transacciones → empty-state visible', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/transactions', { ...BASE });

    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible({ timeout: 8000 });
    await expect(emptyState).toContainText('No hay transacciones');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-08: con datos
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Transaction List — con datos (REQ-E2E-08)', () => {

  test('sc1: con transacciones → ion-list visible con ion-item-sliding', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/transactions', {
      ...BASE,
      transactions: buildMockTransactions(3),
    });

    await expect(page.locator('ion-list')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('ion-item-sliding').first()).toBeVisible();
  });

  test('sc2: los 3 selectores de filtro son visibles en el header', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/transactions', {
      ...BASE,
      transactions: buildMockTransactions(3),
    });

    const selects = page.locator('ion-header ion-select');
    await expect(selects).toHaveCount(3);
  });
});
