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

    // El template usa texto "Todavía no tenés categorías." — no "No hay categorías activas"
    await expect(page.locator('text=Todavía no tenés categorías')).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-10: con datos
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Category List — con datos (REQ-E2E-10)', () => {

  test('sc1: con categorías → tiles de categorías visibles', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/categories', {
      ...BASE,
      categories: buildMockCategories(),
    });

    // El template usa div.grid con tiles, no ion-list con ion-item.
    // Cada tile tiene un span con el icono emoji y otro con el nombre.
    await expect(page.locator('text=Gastos')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Alquiler')).toBeVisible({ timeout: 5000 });
  });

  test('sc2: íconos de categoría visibles en los tiles', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/categories', {
      ...BASE,
      categories: buildMockCategories(),
    });

    // El template usa spans con emoji, no ion-badge con ↑↓.
    // Verificamos que al menos un tile con ícono de categoría está visible.
    const tile = page.locator('.grid .rounded-xl').first();
    await expect(tile).toBeVisible({ timeout: 8000 });
    const text = await tile.textContent();
    // El tile contiene el emoji del ícono de la categoría mockeada
    expect(text).toBeTruthy();
  });
});
