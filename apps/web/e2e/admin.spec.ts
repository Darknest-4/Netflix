import { expect, test } from '@playwright/test';

import { ADMIN_STATE, MEMBER_STATE } from './fixtures';

test.describe('Admin panel', () => {
  test.use({ storageState: ADMIN_STATE });

  test('a KPI-k és a diagramok megjelennek', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'Adminisztráció' })).toBeVisible();
    await expect(page.getByText('MRR')).toBeVisible();
    await expect(page.getByRole('img', { name: /Regisztrációk/ })).toBeVisible();
  });

  test('a tartalomkezelő listázza a katalógust', async ({ page }) => {
    await page.goto('/admin');

    await page.getByRole('button', { name: 'Tartalomkezelés' }).click();

    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Új tartalom' })).toBeVisible();
  });

  test.describe('tag jogosultsággal', () => {
    test.use({ storageState: MEMBER_STATE });

    test('a tag felhasználó nem éri el az admin felületet', async ({ page }) => {
      await page.goto('/admin');

      await expect(page).toHaveURL(/\/browse/);
    });
  });
});
