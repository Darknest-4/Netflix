import { expect, test } from '@playwright/test';

import { MEMBER_STATE } from './fixtures';

test.use({ storageState: MEMBER_STATE });

test.describe('Böngészés', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/browse');
  });

  test('a billboard és a sorok betöltenek', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Lejátszás' }).or(page.getByRole('link', { name: 'Lejátszás' }))).toBeTruthy();
    await expect(page.getByRole('heading', { name: 'Népszerű most' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Top 10/ })).toBeVisible();
  });

  test('a folytasd a nézést sor haladásjelzőt mutat', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Folytasd a nézést' })).toBeVisible();
    await expect(page.getByRole('progressbar').first()).toBeVisible();
  });

  test('a keresés találatokat ad', async ({ page }) => {
    await page.goto('/search?q=thriller');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('thriller');
    await expect(page.locator('article').first()).toBeVisible();
  });

  test('az adatlap megnyitható és mutatja a stábot', async ({ page }) => {
    await page.goto('/title/eszaki-feny');

    await expect(page.getByRole('heading', { name: 'Északi Fény' })).toBeVisible();
    await expect(page.getByText('Rendező')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Epizódok' })).toBeVisible();
  });

  test('a sötét és világos mód váltható', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: /Váltás világos módra/ }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });
});
