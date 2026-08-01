import { expect, test } from '@playwright/test';

test('dashboard renders the seeded season aggregation', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByRole('link', { name: 'Australian Grand Prix' })).toBeVisible();
  await expect(page.locator('article').filter({ hasText: 'ROUNDS' }).getByText('1')).toBeVisible();
  await expect(page.getByText('Lando Norris').first()).toBeVisible();
});

test('driver roster opens a real season profile', async ({ page }) => {
  await page.goto('/drivers');
  const landoCard = page.locator('a.driver-card').filter({ hasText: 'Lando Norris' });

  await expect(landoCard).toBeVisible();
  await landoCard.click();

  await expect(page.getByRole('heading', { name: 'Lando Norris' })).toBeVisible();
  await expect(page.locator('.big-stats').getByText('25')).toBeVisible();
  const avgFinish = page.locator('.mini-stats > div').first();
  await expect(avgFinish).toContainText('Avg finish');
  await expect(avgFinish).toContainText('1');
});

test('race calendar links classification to race analysis', async ({ page }) => {
  await page.goto('/races');
  await page.getByRole('link', { name: /Australian Grand Prix/ }).click();

  await expect(page.getByRole('heading', { name: 'Australian Grand Prix' })).toBeVisible();
  await expect(page.getByText('Lando Norris').first()).toBeVisible();
  await page.getByRole('link', { name: 'Open analysis' }).click();

  await expect(page.getByRole('heading', { name: 'Race Review' })).toBeVisible();
  await expect(page.getByText('RACE WINNER')).toBeVisible();
  await expect(page.getByText('Lando Norris').first()).toBeVisible();
});

test('prediction builder loads backend context and reports model readiness', async ({ page }) => {
  await page.goto('/predictions');

  await expect(page.getByRole('heading', { name: 'Race Prediction' })).toBeVisible();
  await expect(page.getByText('3 drivers')).toBeVisible();
  await expect(page.getByText('Model unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run prediction' })).toBeDisabled();
});

test('team standings use the seeded constructor results', async ({ page }) => {
  await page.goto('/teams');
  const mclaren = page.locator('article.team').filter({ hasText: 'McLaren' });

  await expect(mclaren).toBeVisible();
  await expect(mclaren).toContainText('25');
  await expect(mclaren).toContainText('1');
});

test('sign out clears the session and restores route protection', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Fdashboard$/);
});
