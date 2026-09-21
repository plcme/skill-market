import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('public home is accessible and fits the viewport', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  const name = await page.getByRole('heading', { level: 1 }).innerText();
  await expect(page).toHaveTitle(name);
  await expect(page.getByText('Coming soon')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
});
