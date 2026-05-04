import { test, expect } from '@playwright/test';
import { setupAndNavigate } from './helpers/auth-helpers';
import { buildMockWallets, buildMockTransactions, buildMockUsers } from './helpers/mock-data';

const BASE = { users: buildMockUsers() };

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-11: estado vacío
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Wallet List — estado vacío (REQ-E2E-11)', () => {

  test('sc1: sin carteras → mensaje de estado vacío visible', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/wallets', { ...BASE });

    // El template usa texto "Todavía no tenés carteras." — no "No hay carteras creadas"
    await expect(page.locator('text=Todavía no tenés carteras')).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-12: con datos
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Wallet List — con datos (REQ-E2E-12)', () => {

  test('sc1: con carteras → cards de cartera visibles con nombres', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/wallets', {
      ...BASE,
      wallets: buildMockWallets(),
      transactions: buildMockTransactions(3),
    });

    // El template usa div.grid con cards, no ion-list con ion-item.
    // Nombre de la primera cartera mockeada: "Efectivo"
    await expect(page.locator('text=Efectivo')).toBeVisible({ timeout: 8000 });
  });

  test('sc2: balance formateado visible en la card de cartera', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/wallets', {
      ...BASE,
      wallets: buildMockWallets(),
      transactions: buildMockTransactions(3),
    });

    // El balance se renderiza en un span con clases Tailwind dinámicas (text-myfinance-green/red),
    // no con style inline. Verificamos que hay al menos un span de balance con número.
    const balanceEl = page.locator('span.font-extrabold').first();
    await expect(balanceEl).toBeVisible({ timeout: 8000 });
    const text = await balanceEl.textContent();
    // Debe contener algún número o símbolo de moneda
    expect(text).toMatch(/[\d$€£]/);
  });
});
