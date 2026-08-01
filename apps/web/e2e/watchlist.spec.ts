import { expect, test } from '@playwright/test';

import { MEMBER_STATE } from './fixtures';

test.use({ storageState: MEMBER_STATE });

test.describe('Saját lista', () => {
  test('tartalom hozzáadható és eltávolítható', async ({ page }) => {
    await page.goto('/title/vasvirag');

    const toggle = page.getByRole('button', { name: /listámhoz|listámról/ });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/my-list');
    await expect(page.getByRole('link', { name: /Vasvirág/ }).first()).toBeVisible();

    await page.goto('/title/vasvirag');
    await page.getByRole('button', { name: /listámról/ }).click();
    await expect(page.getByRole('button', { name: /listámhoz/ })).toBeVisible();
  });
});
