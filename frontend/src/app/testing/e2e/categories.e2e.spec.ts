import { test, expect } from '@playwright/test';
import { setupAndNavigate } from './helpers/auth-helpers';
import { buildMockCategories, buildMockWallets, buildMockUsers } from './helpers/mock-data';

const BASE = { wallets: buildMockWallets(), users: buildMockUsers() };

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-09: estado vacío
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Category List — estado vacío (REQ-E2E-09)', () => {

  test('sc1: sin categorías → mensaje de estado vacío visible', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/categories', { ...BASE });

    await expect(page.locator('text=No hay categorías activas')).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-10: con datos
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Category List — con datos (REQ-E2E-10)', () => {

  test('sc1: con categorías → ion-list visible con ítems', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/categories', {
      ...BASE,
      categories: buildMockCategories(),
    });

    await expect(page.locator('ion-list')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('ion-list ion-item').first()).toBeVisible();
  });

  test('sc2: ion-badge con símbolo de tipo visible', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/categories', {
      ...BASE,
      categories: buildMockCategories(),
    });

    const badge = page.locator('ion-badge').first();
    await expect(badge).toBeVisible({ timeout: 8000 });
    const text = await badge.textContent();
    expect(text?.trim()).toMatch(/[↑↓]/);
  });
});
