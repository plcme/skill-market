import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Frontend feedback round 2: breakdown, simple location filter, ASC core competencies.
// Round 3 folded the breakdown into the detail page's one chart (see detail-chart.spec.ts).

test('role page chart splits by dimension through the URL', async ({ page }) => {
  test.slow();
  await page.goto('/r/data-analyst?by=experience');
  const chart = page.locator('section#now');
  await expect(page.locator('section#breakdown')).toHaveCount(0);
  const legend = chart.getByRole('list', { name: 'Latest values' });
  await expect(legend.getByText('Expert · 10+ yrs')).toBeVisible();
  await expect(chart.getByText('Estimated')).toBeVisible();
  const menu = page.getByRole('dialog', { name: 'Filter' });
  await expect(async () => {
    if (!(await menu.isVisible())) await page.locator('h1').getByRole('button').click({ timeout: 5000 });
    await expect(menu).toBeVisible({ timeout: 5000 });
  }).toPass({ timeout: 40000 });
  await menu.getByRole('radio', { name: 'Work rights', exact: true }).click();
  await menu.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page).toHaveURL(/by=rights/, { timeout: 30000 });
  await expect(legend.getByText('Requires PR or citizenship')).toBeVisible();
  await chart.getByRole('button', { name: 'Show data table' }).click();
  await expect(chart.getByRole('table')).toBeVisible();
  const axe = await new AxeBuilder({ page }).include('section#now').analyze();
  expect(axe.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);

  await page.goto('/r/data-analyst?y=salary&by=mode');
  await expect(chart.getByText(/ads state a salary/)).toBeVisible();
  await expect(chart.getByText('Estimated')).toHaveCount(0);
  await expect(legend.getByText('Remote')).toBeVisible();
});

test('remote-anywhere switch changes the readback and the URL', async ({ page }) => {
  test.slow();
  await page.goto('/s/sql?f=oh.au-nsw-sydney_all_all');
  const open = page.locator('h1').getByRole('button');
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
  await page.goto('/s/sql?f=o.au-nsw*h.au-vic_all_all');
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
    // Let hydration of every row finish before judging the console.
    await page.waitForTimeout(1500);
  }
  expect(errors).toEqual([]);
});
