import { expect, test } from '@playwright/test';
import { TEST_USER } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test('landing page presents the public product entry points', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /Race intelligence, engineered from data/i }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Dashboard' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'View Race Calendar' })).toBeVisible();
});

test('protected routes redirect guests to sign in and retain the destination', async ({ page }) => {
  await page.goto('/drivers');

  await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Fdrivers$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('invalid credentials show a readable error', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill('IncorrectPassword!');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
});

test('unknown routes render the branded not-found page', async ({ page }) => {
  await page.goto('/not-a-real-pitstop-route');

  await expect(page.getByText('404')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lost on the circuit.' })).toBeVisible();
});
