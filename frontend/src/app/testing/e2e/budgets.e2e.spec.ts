import { test, expect } from '@playwright/test';
import { setupAndNavigate } from './helpers/auth-helpers';
import { buildMockBudgets, buildMockCategories, buildMockUsers } from './helpers/mock-data';

const CURRENT_PERIOD = new Date().toISOString().slice(0, 7);
const BASE = { categories: buildMockCategories(), users: buildMockUsers() };

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-13: estado vacío
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Budget List — estado vacío (REQ-E2E-13)', () => {

  test('sc1: sin presupuestos → empty-state visible', async ({ page }) => {
    await setupAndNavigate(page, '/budgets', { ...BASE });

    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible({ timeout: 8000 });
    await expect(emptyState).toContainText('No hay presupuestos para este período');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-14: con datos
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Budget List — con datos (REQ-E2E-14)', () => {

  test('sc1: con presupuestos → app-budget-indicator visible en ion-list', async ({ page }) => {
    await setupAndNavigate(page, '/budgets', {
      ...BASE,
      budgets: buildMockBudgets(CURRENT_PERIOD),
    });

    await expect(page.locator('ion-list')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('app-budget-indicator').first()).toBeVisible();
  });

  test('sc2: period-selector responde al click en botón anterior', async ({ page }) => {
    await setupAndNavigate(page, '/budgets', {
      ...BASE,
      budgets: buildMockBudgets(CURRENT_PERIOD),
    });

    const selector = page.locator('app-period-selector');
    await expect(selector).toBeVisible({ timeout: 8000 });

    const labelBefore = await selector.locator('.period-label').textContent();

    const prevBtn = selector.locator('ion-button').first();
    await prevBtn.click();
    await page.waitForTimeout(500);

    const labelAfter = await selector.locator('.period-label').textContent();
    expect(labelAfter).not.toBe(labelBefore);
  });
});
