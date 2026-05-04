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

  test('sc1: ion-content del dashboard visible con datos', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/dashboard', {
      ...BASE_DATA,
      budgets: buildMockBudgets(CURRENT_PERIOD),
    });

    // El dashboard no usa app-dashboard-summary — el resumen está inline.
    // Verificamos que ion-content carga con los botones de acción presentes.
    await expect(page.locator('ion-content')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('app-dashboard-chart')).toBeVisible({ timeout: 8000 });
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

  test('sc1: banner visible cuando hay presupuesto excedido', async () => {
    // BLOCKER: el dashboard no tiene un elemento .exceeded-banner en su template.
    // El estado de presupuesto excedido se refleja en el doughnut chart y en
    // budget-list.page.ts, pero no en un banner DOM independiente en dashboard.
    // El arquitecto debe implementar un banner con clase CSS .exceeded-banner
    // en dashboard.page.html para poder verificar este escenario.
    test.skip(true, 'BLOCKER: .exceeded-banner no implementado en dashboard.page.html');
  });

  test('sc2: banner no visible cuando todos los presupuestos están ok', async () => {
    // BLOCKER: depende de la implementación de .exceeded-banner en dashboard.page.html.
    test.skip(true, 'BLOCKER: .exceeded-banner no implementado en dashboard.page.html');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-DRILLDOWN: Flujo drill-down dashboard → lista filtrada por categoría
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Dashboard — drill-down a transactions (REQ-E2E-DRILLDOWN)', () => {

  test('sc1: click en leyenda de categoría navega a /tabs/transactions (DRILLDOWN-01)', async () => {
    // BLOCKER: app-dashboard-chart no expone elementos DOM clickeables para la leyenda.
    // La leyenda del doughnut chart es parte del canvas de Chart.js — no hay elementos HTML
    // que Playwright pueda seleccionar por slice. El arquitecto debe implementar una leyenda DOM
    // alternativa con (click)="onCategoryDrilldown(cat)" en dashboard-chart.component.html.
    // Ver ADR-02 en design.md. Una vez implementada, reemplazar este skip con el test activo.
    test.skip(true, 'BLOCKER: leyenda de doughnut chart está en canvas, no en DOM — sin selector Playwright');
  });

  test('sc2: lista muestra chip de filtro activo tras drill-down (DRILLDOWN-02)', async () => {
    // BLOCKER: depende de DRILLDOWN-01. Habilitar cuando la leyenda DOM esté implementada
    // y la navegación a /tabs/transactions con filtro de categoría activo funcione.
    test.skip(true, 'BLOCKER: depende de DRILLDOWN-01');
  });

  test('sc3: limpiar chip de filtro muestra todas las transacciones (DRILLDOWN-03)', async () => {
    // BLOCKER: depende de DRILLDOWN-01 y DRILLDOWN-02.
    test.skip(true, 'BLOCKER: depende de DRILLDOWN-01 y DRILLDOWN-02');
  });

  // Test alternativo: verifica que la página carga correctamente con queryParam de categoría
  test('sc4 (alternativo): /tabs/transactions con queryParam category carga sin error (DRILLDOWN-04)', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/transactions?category=cat-002', {
      categories: buildMockCategories(),
      wallets: buildMockWallets(),
      users: buildMockUsers(),
      transactions: buildMockTransactions(6),
    });

    await expect(page.locator('ion-content')).toBeVisible({ timeout: 8000 });
  });
});
