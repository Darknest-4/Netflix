import { test as setup } from '@playwright/test';

import { DEMO, MEMBER_STATE, ADMIN_STATE, signIn } from './fixtures';

/**
 * Signs in once per account and stores the browser state.
 *
 * Every other spec reuses these states instead of logging in again: the suite
 * gets faster, and it stops hammering the login endpoint, whose rate limit is a
 * deliberate production safeguard.
 */
setup('member munkamenet mentése', async ({ page }) => {
  await signIn(page, 'member', 'Anna');
  await page.context().storageState({ path: MEMBER_STATE });
});

setup('admin munkamenet mentése', async ({ page }) => {
  await signIn(page, 'admin', 'Admin');
  await page.context().storageState({ path: ADMIN_STATE });
});

// Referenced so the credentials stay in one place and unused-import lint passes.
export { DEMO };
