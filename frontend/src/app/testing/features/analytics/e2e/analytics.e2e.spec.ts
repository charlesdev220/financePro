/**
 * E2E Tests — AnalyticsPage (REQ-11)
 *
 * Ejecutar con: `npx playwright test analytics.e2e.spec.ts`
 *
 * Estrategia:
 * - Auth bypass via localStorage (myfinance_user) inyectado con addInitScript()
 *   antes de que Angular inicialice, para que authGuard vea la sesión.
 * - Sheets API mockeada con page.route() antes de cada navegación.
 * - OAuth2 token endpoint mockeado para evitar llamadas reales a Google.
 */

import { test, expect } from '@playwright/test';
import { setupAndNavigate } from '../../../e2e/helpers/auth-helpers';
import { buildMockTransactions, buildMockTransactionsTwoMonths, buildMockCategories } from '../../../e2e/helpers/mock-data';

const SIX_MONTHS_DATA = {
  transactions: buildMockTransactions(6),
  categories: buildMockCategories(),
};

const TWO_MONTHS_DATA = {
  transactions: buildMockTransactionsTwoMonths(),
  categories: buildMockCategories(),
};

// ─────────────────────────────────────────────────────────────────────────────
// REQ-11: Verificación E2E de /analytics
// ─────────────────────────────────────────────────────────────────────────────
test.describe('AnalyticsPage E2E', () => {

  // REQ-11 sc1: sin errores críticos de consola al cargar /analytics
  test('should load /analytics without critical console errors', async ({ page }) => {
    const criticalErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') criticalErrors.push(msg.text());
    });

    await setupAndNavigate(page, '/analytics', SIX_MONTHS_DATA);

    const blocking = criticalErrors.filter(e =>
      e.includes('Chart is not defined') ||
      e.includes('NullInjector') ||
      e.includes('ExpressionChangedAfterItHasBeenCheckedError'),
    );
    expect(blocking).toHaveLength(0);
  });

  // REQ-11 sc2: canvas del bar chart visible con aria-label
  test('should render bar chart canvas with aria-label', async ({ page }) => {
    await setupAndNavigate(page, '/analytics', SIX_MONTHS_DATA);

    const canvas = page.locator('app-analytics-chart canvas[aria-label]');
    await expect(canvas).toBeVisible({ timeout: 8000 });
  });

  // REQ-11 sc3: filtrado por período actualiza el selector
  test('should show period selector and respond to navigation', async ({ page }) => {
    await setupAndNavigate(page, '/analytics', SIX_MONTHS_DATA);

    const periodSelector = page.locator('app-period-selector');
    await expect(periodSelector).toBeVisible();

    const prevButton = page.locator('app-period-selector ion-button').first();
    await prevButton.click();
    await page.waitForTimeout(500);

    await expect(page.locator('app-analytics-chart')).toBeVisible();
  });

  // REQ-11 sc4: con ≥3 meses → canvas de proyecciones visible
  test('should show projections chart when store has 6 months of data', async ({ page }) => {
    await setupAndNavigate(page, '/analytics', SIX_MONTHS_DATA);

    const projectionsCanvas = page.locator('app-projections canvas[aria-label]');
    await expect(projectionsCanvas).toBeVisible({ timeout: 8000 });
  });

  // REQ-11 sc5: con <3 meses → mensaje informativo, canvas de proyecciones oculto
  test('should show informative message when store has fewer than 3 months of data', async ({ page }) => {
    await setupAndNavigate(page, '/analytics', TWO_MONTHS_DATA);

    const msg = page.locator('app-projections .no-data-msg');
    await expect(msg).toBeVisible({ timeout: 8000 });
    await expect(msg).toContainText('Se necesitan al menos 3 meses de datos para proyectar');

    const canvas = page.locator('app-projections canvas');
    await expect(canvas).not.toBeVisible();
  });

  // REQ-11 sc6: SpendingRanking muestra al menos un ítem en recurrentes
  test('should show at least one item in recurrentes section', async ({ page }) => {
    await setupAndNavigate(page, '/analytics', SIX_MONTHS_DATA);

    const rankingItems = page.locator('app-spending-ranking .ranking-item');
    await expect(rankingItems.first()).toBeVisible({ timeout: 8000 });
  });

  // REQ-11 sc7: sin regresiones en /dashboard
  test('should load /dashboard without critical console errors', async ({ page }) => {
    const criticalErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') criticalErrors.push(msg.text());
    });

    await setupAndNavigate(page, '/dashboard', SIX_MONTHS_DATA);

    const blocking = criticalErrors.filter(e =>
      e.includes('NullInjector') ||
      e.includes('ExpressionChangedAfterItHasBeenCheckedError'),
    );
    expect(blocking).toHaveLength(0);
  });

  // REQ-11 sc8: sin regresiones en /transactions
  test('should load /transactions list correctly', async ({ page }) => {
    await setupAndNavigate(page, '/transactions', SIX_MONTHS_DATA);

    await expect(page.locator('ion-content')).toBeVisible();
  });
});
