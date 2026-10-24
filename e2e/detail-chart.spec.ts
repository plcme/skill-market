import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// FE-R5/R6: the title's Filter sheet owns the measure and split; default is None.
async function openFilter(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Filter', exact: true });
  await expect(async () => {
    if (!(await dialog.isVisible())) await page.locator('h1').getByRole('button').click({ timeout: 5000 });
    await expect(dialog).toBeVisible({ timeout: 5000 });
  }).toPass({ timeout: 40000 });
  return dialog;
}
async function fitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('one chart: the Filter sheet changes measure, split and places together', async ({ page }) => {
  test.slow();
  await page.goto('/s/sql');
  const chart = page.locator('section#now');
  const legend = chart.getByRole('list', { name: 'Latest values' });
  await expect(chart.getByRole('img')).toHaveCount(1);
  await expect(page.locator('section#breakdown')).toHaveCount(0);
  await expect(legend.getByRole('listitem')).toHaveCount(1);
  let filter = await openFilter(page);
  await expect(filter.getByRole('radio', { name: 'None', exact: true })).toHaveAttribute('aria-checked', 'true');
  await filter.getByRole('radio', { name: 'Median salary', exact: true }).click();
  await filter.getByRole('radio', { name: 'Work mode', exact: true }).click();
  await filter.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page).toHaveURL(/[?&]metric=salary_median/);
  await expect(page).toHaveURL(/[?&]by=mode/);
  await expect(chart.getByText(/ads state a salary/)).toBeVisible();
  await expect(legend.getByText('Remote')).toBeVisible();

  const title = page.locator('h1');
  filter = await openFilter(page);
  await filter.getByRole('button', { name: 'Narrow to a state or city' }).click();
  await page.getByPlaceholder('Search a state, city or region').fill('Sydney');
  await page.getByRole('option').filter({ hasText: /^Sydney/ }).first().getByRole('button').click();
  await filter.getByRole('switch', { name: 'Also include remote jobs anywhere in Australia' }).click();
  await filter.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page).toHaveURL(/f=ohr\.au-nsw-sydney(\*|%2A)r\.au_all_all/);
  await expect(title).toHaveText(/^SQL\s+in Sydney \+ remote/);
  filter = await openFilter(page);
  await filter.getByRole('button', { name: 'Reset', exact: true }).click();
  await filter.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page).not.toHaveURL(/[?&]f=/);
  await expect(page).toHaveURL(/metric=salary_median/);
  await expect(page).toHaveURL(/by=mode/);
  const axe = await new AxeBuilder({ page }).include('main').analyze();
  expect(axe.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => v.id)).toEqual([]);
});

test('industries do not offer a salary measure', async ({ page }) => {
  await page.goto('/i/mining?y=salary');
  const filter = await openFilter(page);
  await expect(filter.getByRole('radio', { name: 'Median salary', exact: true })).toHaveCount(0);
  await expect(filter.getByRole('radio', { name: 'None', exact: true })).toHaveAttribute('aria-checked', 'true');
});

test('title reads the whole filter and resets from the Filter sheet', async ({ page }) => {
  await page.goto('/s/python?f=oh.au_entry_all');
  const title = page.locator('h1');
  await expect(title).toHaveText(/^Python\s+in All Australia · Entry-level · On-site or hybrid/);
  const filter = await openFilter(page);
  await expect(filter.getByTestId('filter-readback')).toHaveText(/Entry-level only/);
  await filter.getByRole('button', { name: 'Reset', exact: true }).click();
  await filter.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page).not.toHaveURL(/[?&]f=/);
  await expect(title).toHaveText(/^Python\s+in All Australia/);
});

test('detail Filter fits a 375px screen as a bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/s/sql?metric=salary_median&by=mode&f=oh.au-nsw-sydney.au-vic-melbourne*r.au_entry_npr');
  await fitsViewport(page);
  const filter = await openFilter(page);
  await expect(filter).toBeVisible();
  const box = await filter.boundingBox();
  expect(box?.x).toBe(0);
  expect(box?.width).toBe(375);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThan(800);
  await fitsViewport(page);
  await expect(filter.getByRole('radio', { name: 'Work mode', exact: true })).toBeVisible();
});

test('keyboard can change split and focus returns to the title trigger', async ({ page }) => {
  await page.goto('/s/python');
  const trigger = page.locator('h1').getByRole('button');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const filter = page.getByRole('dialog', { name: 'Filter', exact: true });
  await expect(filter).toBeVisible();
  await filter.getByRole('radio', { name: 'Work mode', exact: true }).focus();
  await page.keyboard.press('Space');
  await filter.getByRole('button', { name: 'Apply', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/[?&]by=mode/);
  await expect(trigger).toBeFocused();
});
