import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Frontend feedback round 3: one chart on detail pages, driven by a Y axis pill
// (?y=) and a Split by slot (?by=), with places chosen in the title (?f=).

/** Open a menu; the first click can land before hydration under load, so retry until it opens. */
async function open(page: Page, trigger: Locator, name: string): Promise<Locator> {
  const dialog = page.getByRole('dialog', { name });
  await expect(async () => {
    if (!(await dialog.isVisible())) await trigger.click({ timeout: 5000 });
    await expect(dialog).toBeVisible({ timeout: 5000 });
  }).toPass({ timeout: 40000 });
  return dialog;
}

async function fitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('detail page has one chart: Y axis, Split by and places update the URL', async ({ page }) => {
  test.slow();
  await page.goto('/s/sql');
  const chart = page.locator('section#now');
  await expect(page.getByRole('button', { name: /Edit filter|Filter the whole board/ })).toHaveCount(0);
  await expect(page.locator('section#breakdown')).toHaveCount(0);
  await expect(chart.getByRole('img')).toHaveCount(1);

  // Y axis → Median salary (skills have it since 2026-10-17).
  const yMenu = await open(page, chart.getByRole('button', { name: 'Y axis: Job ads. Change' }), 'Y axis');
  await expect(yMenu.getByRole('button', { name: /^(Job ads|Median salary)$/ })).toHaveText(['Job ads', 'Median salary']);
  await yMenu.getByRole('button', { name: 'Median salary', exact: true }).click();
  await expect(page).toHaveURL(/[?&]y=salary/, { timeout: 30000 });
  await expect(chart.getByRole('button', { name: 'Y axis: Median salary. Change' })).toBeVisible();
  await expect(chart.getByText(/ads state a salary/)).toBeVisible();

  // Split → none, then Work mode.
  await chart.getByRole('button', { name: 'Stop splitting' }).click();
  await expect(page).toHaveURL(/[?&]by=none/, { timeout: 30000 });
  await expect(chart.getByRole('list', { name: 'Latest values' }).getByRole('listitem')).toHaveCount(1);
  const split = await open(page, chart.getByRole('button', { name: 'Not split. Choose a split' }), 'Split by');
  await expect(split.getByText('Entry · Mid · Senior · Expert')).toBeVisible();
  await split.getByRole('button', { name: /^Work mode/ }).click();
  await expect(page).toHaveURL(/[?&]by=mode/, { timeout: 30000 });
  await expect(chart.getByRole('list', { name: 'Latest values' }).getByText('Remote')).toBeVisible();
  await expect(page).toHaveURL(/[?&]y=salary/);

  // The title is the filter entry: it opens the same Filter sheet as the board.
  // Not by role: the phone bottom sheet is modal, so the page behind it is hidden from the a11y tree.
  const title = page.locator('h1');
  await expect(title).toHaveText(/^SQL\s+in All Australia/);
  let filter = await open(page, title.getByRole('button'), 'Filter');
  await filter.getByRole('button', { name: 'Narrow to a state or city' }).click();
  await page.getByPlaceholder('Search a state, city or region').fill('Sydney');
  await page.getByRole('option').filter({ hasText: /^Sydney/ }).first().getByRole('button').click();
  await filter.getByRole('switch', { name: 'Also include remote jobs anywhere in Australia' }).click();
  await filter.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/f=ohr\.au-nsw-sydney(\*|%2A)r\.au_all_all/, { timeout: 30000 });
  await expect(title).toHaveText(/^SQL\s+in Sydney \+ remote/);
  filter = await open(page, title.getByRole('button'), 'Filter');
  await filter.getByRole('button', { name: 'Reset' }).click();
  await filter.getByRole('button', { name: 'Apply' }).click();
  await expect(page).not.toHaveURL(/[?&]f=/, { timeout: 30000 });
  await expect(title).toHaveText(/^SQL\s+in All Australia/);
  // Chart choices survive filter changes.
  await expect(page).toHaveURL(/y=salary/);
  await expect(page).toHaveURL(/by=mode/);

  const axe = await new AxeBuilder({ page }).include('main').analyze();
  expect(axe.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
});

test('industries have no salary: the Y axis is a fixed label', async ({ page }) => {
  await page.goto('/i/mining?y=salary');
  const chart = page.locator('section#now');
  await expect(chart.getByText('Job ads', { exact: true }).first()).toBeVisible();
  await expect(chart.getByRole('button', { name: /^Y axis:/ })).toHaveCount(0);
});

test('the title reads the whole filter and resets from the Filter sheet', async ({ page }) => {
  await page.goto('/s/python?f=oh.au_entry_all');
  const title = page.locator('h1');
  await expect(title).toHaveText(/^Python\s+in All Australia · Entry-level · On-site or hybrid/);
  const filter = await open(page, title.getByRole('button', { name: /Change filter$/ }), 'Filter');
  await expect(filter.getByTestId('filter-readback')).toHaveText(/Entry-level only/);
  await filter.getByRole('button', { name: 'Reset' }).click();
  await filter.getByRole('button', { name: 'Apply' }).click();
  await expect(page).not.toHaveURL(/[?&]f=/, { timeout: 30000 });
  await expect(title).toHaveText(/^Python\s+in All Australia/);
});

test('detail chart fits a 375px screen with menus as bottom sheets', async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 375, height: 812 });
  // by=mode: entry-level fixes the experience split, so it would draw unsplit.
  await page.goto('/s/sql?y=salary&by=mode&f=oh.au-nsw-sydney.au-vic-melbourne*r.au_entry_npr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^SQL\s+in Sydney, Melbourne \+ remote/);
  await fitsViewport(page);
  const chart = page.locator('section#now');
  const split = await open(page, chart.getByRole('button', { name: /^Split by Work mode/ }), 'Split by');
  const box = await split.boundingBox();
  // A bottom sheet: full width, flush with the bottom edge (allowing for the entry animation).
  expect(box?.x).toBe(0);
  expect(box?.width).toBe(375);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThan(800);
  await fitsViewport(page);
  // Menu options are comfortable touch targets.
  for (const b of await split.getByRole('button', { name: /Experience|Work rights|Work mode/ }).all()) {
    expect((await b.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test('keyboard focus stays on the controls after split changes', async ({ page }) => {
  test.slow();
  await page.goto('/s/python?f=oh.au_all_all');
  const chart = page.locator('section#now');

  // Clear the split with the keyboard: focus moves to the Split by trigger, not <body>.
  const clear = chart.getByRole('button', { name: 'Stop splitting' });
  await expect(async () => {
    if (!/by=none/.test(page.url())) {
      await clear.focus({ timeout: 5000 });
      await page.keyboard.press('Enter');
    }
    await expect(page).toHaveURL(/[?&]by=none/, { timeout: 10000 });
  }).toPass({ timeout: 40000 });
  const none = chart.getByRole('button', { name: 'Not split. Choose a split' });
  await expect(none).toBeFocused();

  // Pick a split from the "None" state with the keyboard: focus returns to the same trigger.
  await page.keyboard.press('Enter');
  const menu = page.getByRole('dialog', { name: 'Split by' });
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: /^Work mode/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/[?&]by=mode/, { timeout: 30000 });
  await expect(chart.getByRole('button', { name: 'Split by Work mode. Change' })).toBeFocused();

  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
});
