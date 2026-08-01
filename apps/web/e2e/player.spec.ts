import { expect, test } from '@playwright/test';

import { MEMBER_STATE } from './fixtures';

test.use({ storageState: MEMBER_STATE });

test.describe('Lejátszó', () => {
  test('betölti a vezérlőket és a felirat sávokat', async ({ page }) => {
    await page.goto('/watch/t-003-hetedik-hullam');

    await expect(page.getByRole('button', { name: 'Lejátszás' }).or(page.getByRole('button', { name: 'Szünet' }))).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Lejátszási pozíció' })).toBeVisible();

    // A manifestből érkező feliratsávok a <video> elem alá kerülnek.
    await expect(page.locator('video track')).not.toHaveCount(0);
  });

  test('a felirat- és hangsávmenü megnyitható', async ({ page }) => {
    await page.goto('/watch/t-003-hetedik-hullam');

    await page.getByRole('button', { name: 'Feliratok és hangsávok' }).click();

    await expect(page.getByRole('group', { name: 'Hangsáv' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Felirat' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Kikapcsolva' })).toBeVisible();
  });
});
