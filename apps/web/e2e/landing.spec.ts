import { expect, test } from '@playwright/test';

test.describe('Landing oldal', () => {
  test('megjeleníti az ajánlatot és a csomagokat', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Korlátlan');
    await expect(page.getByRole('heading', { name: 'Válassz csomagot' })).toBeVisible();
    await expect(page.getByText('Legnépszerűbb').first()).toBeVisible();
  });

  test('a GYIK elemei kinyithatók', async ({ page }) => {
    await page.goto('/');

    const question = page.getByRole('group').filter({ hasText: 'Mennyibe kerül?' }).first();
    await question.getByText('Mennyibe kerül?').click();

    await expect(question).toContainText('Nincs szerződés');
  });

  test('az e-mail beírása a regisztrációra visz', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('E-mail cím').fill('uj.nezo@example.com');
    await page.getByRole('button', { name: 'Kezdjük' }).click();

    await expect(page).toHaveURL(/\/signup/);
  });

  test('SEO metaadatok jelen vannak', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/NOVA/);
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  });
});
