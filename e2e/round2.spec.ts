import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Frontend feedback round 2: breakdown, simple location filter, ASC core competencies.

test('role page breakdown switches dimension through the URL', async ({ page }) => {
  test.slow();
  await page.goto('/r/data-analyst');
  const section = page.locator('section#breakdown');
  await expect(section.getByRole('heading', { name: 'Breakdown' })).toBeVisible();
  const legend = section.getByRole('list', { name: 'Breakdown values' });
  await expect(legend.getByText('Expert · 10+ yrs')).toBeVisible();
  await expect(section.getByText('Estimated')).toBeVisible();
  await expect(section.getByText(/Breakdown shows Job ads/)).toBeVisible();
  // The click can land before hydration under load; retry until the URL changes.
  await expect(async () => {
    if (!/by=rights/.test(page.url())) await section.getByRole('radio', { name: 'Work rights' }).click({ timeout: 5000 });
    await expect(page).toHaveURL(/by=rights/, { timeout: 10000 });
  }).toPass({ timeout: 40000 });
  await expect(legend.getByText('Requires PR or citizenship')).toBeVisible();
  await section.getByRole('button', { name: 'Show data table' }).click();
  await expect(section.getByRole('table')).toBeVisible();
  const axe = await new AxeBuilder({ page }).include('section#breakdown').analyze();
  expect(axe.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);

  await page.goto('/r/data-analyst?metric=salary_median&by=mode');
  await expect(section.getByText(/ads that state a salary/)).toBeVisible();
  await expect(section.getByText('Estimated')).toHaveCount(0);
  await expect(legend.getByText('Remote')).toBeVisible();
});

test('remote-anywhere switch changes the readback and the URL', async ({ page }) => {
  test.slow();
  await page.goto('/market?type=skill&f=oh.au-nsw-sydney_all_all');
  const open = page.getByRole('button', { name: /Filter the whole board/ });
  const dialog = page.getByRole('dialog', { name: 'Filter' });
  await expect(async () => {
    if (!(await dialog.isVisible())) await open.click({ timeout: 5000 });
    await expect(dialog).toBeVisible({ timeout: 5000 });
  }).toPass({ timeout: 40000 });
  const readback = dialog.getByTestId('filter-readback');
  await expect(readback).toHaveText(/Showing on-site or hybrid roles in Sydney · All levels/);
  await dialog.getByRole('switch', { name: 'Also include remote jobs anywhere in Australia' }).click();
  await expect(readback).toHaveText(/plus remote roles anywhere in Australia/);
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/f=oh\.au-nsw-sydney(\*|%2A)r\.au_all_all/, { timeout: 30000 });
  await expect(page.getByText(/plus remote roles anywhere in Australia/).first()).toBeVisible();

  // A spec the simple controls can't express opens with Advanced expanded.
  await page.goto('/market?f=o.au-nsw*h.au-vic_all_all');
  await expect(async () => {
    if (!(await dialog.isVisible())) await open.click({ timeout: 5000 });
    await expect(dialog).toBeVisible({ timeout: 5000 });
  }).toPass({ timeout: 40000 });
  await expect(dialog.getByText('Rule 2')).toBeVisible();
  await expect(dialog.getByRole('switch')).toHaveCount(0);
});

test('searching "communication" explains the core competency instead of a ticker', async ({ page }) => {
  await page.goto('/search?q=communication');
  await expect(page.getByRole('heading', { name: 'Core competencies' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Skills' })).toHaveCount(0);
  await expect(page.getByText(/we don’t track demand for them/).first()).toBeVisible();
  await page.getByRole('link', { name: 'Oral communication' }).click();
  await page.waitForURL(/\/metrics#competency-oral-communication/);
  await expect(page.locator('#core-competencies')).toContainText('Every job uses these, so we don’t track demand for them.');
  await expect(page.locator('#core-competencies')).toContainText('Framework: Australian Skills Classification, Jobs and Skills Australia');
  // Old ticker links land on the explainer, not a 404.
  await page.goto('/s/communication');
  await expect(page).toHaveURL(/\/metrics#competency-oral-communication/);
});

test('skills board narrows to tools or tasks', async ({ page }) => {
  await page.goto('/market?type=skill&layer=task');
  await expect(page.getByRole('radio', { name: 'Tasks' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('link', { name: 'Data analysis' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Python', exact: true })).toHaveCount(0);
});

test('long boards hydrate without console errors in dark mode', async ({ page }) => {
  // Regression: a theme context flipping during hydration re-rendered every
  // dehydrated Suspense boundary and hit React's nested-update limit.
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.emulateMedia({ colorScheme: 'dark' });
  for (const path of ['/market', '/market?type=skill']) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: 'Theme: Dark. Switch to Light' }).filter({ visible: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
