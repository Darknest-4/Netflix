import { expect, test } from '@playwright/test';

import { DEMO, signIn } from './fixtures';

// The login flow is the subject here, so this spec starts from a clean context.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Autentikáció', () => {
  test('sikeres bejelentkezés a profilkapura visz', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail cím').fill(DEMO.member.email);
    await page.getByLabel('Jelszó').fill(DEMO.member.password);
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    await expect(page).toHaveURL(/\/profiles/);
    await expect(page.getByRole('heading', { name: 'Ki nézi?' })).toBeVisible();
  });

  test('hibás jelszó esetén hibaüzenet jelenik meg', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail cím').fill(DEMO.member.email);
    await page.getByLabel('Jelszó').fill('rossz-jelszo');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('a jelszóerősség-mérő reagál a beírt jelszóra', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel('Jelszó').fill('rovid');
    await expect(page.getByText(/Jelszó erőssége/)).toBeVisible();

    await page.getByLabel('Jelszó').fill('ErosJelszo2026!');
    await expect(page.getByText(/Nagyon erős|Erős/)).toBeVisible();
  });

  test('bejelentkezés után elérhető a böngésző felület', async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/browse/);
  });
});
