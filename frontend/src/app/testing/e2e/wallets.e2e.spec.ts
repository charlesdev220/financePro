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

    await expect(page.locator('text=No hay carteras creadas')).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E2E-12: con datos
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Wallet List — con datos (REQ-E2E-12)', () => {

  test('sc1: con carteras → ion-list visible con nombres', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/wallets', {
      ...BASE,
      wallets: buildMockWallets(),
      transactions: buildMockTransactions(3),
    });

    await expect(page.locator('ion-list')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('ion-list ion-item').first()).toBeVisible();
    // Nombre de la primera cartera mockeada: "Efectivo"
    await expect(page.locator('text=Efectivo')).toBeVisible();
  });

  test('sc2: balance formateado visible en ion-item', async ({ page }) => {
    await setupAndNavigate(page, '/tabs/wallets', {
      ...BASE,
      wallets: buildMockWallets(),
      transactions: buildMockTransactions(3),
    });

    // El balance se renderiza como número formateado (span con color success/danger)
    const balanceEl = page.locator('ion-item span[style]').first();
    await expect(balanceEl).toBeVisible({ timeout: 8000 });
    const text = await balanceEl.textContent();
    // Debe contener algún número
    expect(text).toMatch(/\d/);
  });
});
