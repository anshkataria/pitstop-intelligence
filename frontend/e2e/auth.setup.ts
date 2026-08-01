import { expect, test as setup } from '@playwright/test';
import { TEST_USER } from './fixtures';

setup('authenticate test account', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill(TEST_USER.password);
  await page.getByLabel('Remember me').check();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('link', { name: 'Australian Grand Prix' })).toBeVisible();
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
