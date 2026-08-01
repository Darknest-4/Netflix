import { expect, test } from '@playwright/test';

import { MEMBER_STATE } from './fixtures';

test.use({ storageState: MEMBER_STATE });

test.describe('Akadálymentesség', () => {
  test('a landing oldalon van kihagyó link és egyetlen H1', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Ugrás a tartalomra' })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('a főbb űrlapmezők címkézettek', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('E-mail cím')).toBeVisible();
    await expect(page.getByLabel('Jelszó')).toBeVisible();
  });

  test('a modális ablak Escape billentyűre bezárul', async ({ page }) => {
    await page.goto('/title/eszaki-feny');

    await page.getByRole('button', { name: 'Előzetes' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('a navigáció billentyűzettel bejárható', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });
});
