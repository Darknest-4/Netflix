import type { Page } from '@playwright/test';

/** Credentials of the seeded demo accounts. */
export const DEMO = {
  member: { email: 'demo@nova.example', password: 'NovaDemo2026!' },
  admin: { email: 'admin@nova.example', password: 'NovaAdmin2026!' },
} as const;

/** Where the reusable member session is stored (relative to the config root). */
export const MEMBER_STATE = 'e2e/.auth/member.json';

/** Where the reusable administrator session is stored. */
export const ADMIN_STATE = 'e2e/.auth/admin.json';

/**
 * Signs in through the real login form and selects a viewing profile.
 *
 * @param page - Playwright page.
 * @param account - Which seeded account to use.
 * @param profileName - Profile to activate on the gate.
 */
export async function signIn(
  page: Page,
  account: keyof typeof DEMO = 'member',
  profileName = 'Anna',
): Promise<void> {
  const credentials = DEMO[account];

  await page.goto('/login');
  await page.getByLabel('E-mail cím').fill(credentials.email);
  await page.getByLabel('Jelszó').fill(credentials.password);
  await page.getByRole('button', { name: 'Bejelentkezés' }).click();

  await page.waitForURL('**/profiles');
  await page.locator(`button:has-text("${profileName}")`).first().click();
  await page.waitForURL('**/browse');
}
