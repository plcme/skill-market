import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function sampleStudent(page: Page) {
  await page.goto('/market');
  await page.getByRole('button', { name: /Preview controls/ }).click();
  await page.getByRole('button', { name: /Load a sample student/ }).click();
  await page.keyboard.press('Escape');
}

test('palette recovers typos, supports IME, keyboard navigation and focus restoration', async ({ page }, testInfo) => {
  await page.goto('/market');
  const trigger = page.locator('header').getByRole('button', { name: /Search/ }).first();
  await trigger.click();
  const input = page.getByRole('combobox', { name: 'Search skills and roles' });
  await input.fill('pyhton');
  await expect(page.getByRole('option').first()).toContainText('Python');
  await page.screenshot({ path: `/tmp/skill-market-fuzzy-${testInfo.project.name}.png` });
  await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true, keyCode: 229 });
  await expect(input).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(input).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await input.fill('pyhton');
  await input.press('ArrowDown');
  await input.press('ArrowUp');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/s\/python/);
});

test('full search handles typos and core competencies without runtime or accessibility errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/search?q=javascrpt');
  await expect(page.getByRole('link', { name: 'JavaScript', exact: true }).first()).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter(v => ['critical', 'serious'].includes(v.impact ?? '')).map(v => v.id)).toEqual([]);
  await page.getByLabel('Search skills and roles').fill('communciation');
  await page.getByRole('search').getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Oral communication', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Skills', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('board debounces fuzzy input, respects IME and clears results through the URL', async ({ page }) => {
  await page.goto('/market?type=skill&sort=change');
  const input = page.getByLabel('Filter this board by name');
  await input.dispatchEvent('compositionstart');
  await input.fill('pyhton');
  await page.waitForTimeout(400);
  await expect(page).not.toHaveURL(/q=/);
  await input.dispatchEvent('compositionend');
  await expect(page).toHaveURL(/q=pyhton/);
  await expect(page).toHaveURL(/sort=change/);
  await expect(page.getByRole('link', { name: 'Python', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'JavaScript', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Clear.*filter|Clear.*search/i }).click();
  await expect(page).not.toHaveURL(/q=/);
  await expect(page.getByRole('link', { name: 'JavaScript', exact: true }).first()).toBeVisible();
});

test('comparison searches only eligible candidates and selects a typo match', async ({ page }) => {
  await page.goto('/compare?a=python&b=java');
  await page.getByRole('button', { name: /Second: Java.*Change/ }).click();
  const input = page.getByRole('combobox');
  await input.fill('javascrpt');
  await expect(page.getByRole('option').first()).toContainText('JavaScript');
  await expect(page.getByRole('option').filter({ hasText: 'Python' })).toHaveCount(0);
  await input.press('Enter');
  await expect(page).toHaveURL(/b=javascript/);
});

test('student skill search supports typos and excludes held skills', async ({ page }) => {
  await sampleStudent(page);
  await page.goto('/me/skills');
  await page.getByRole('button', { name: 'Add a skill', exact: true }).click();
  const input = page.getByRole('combobox', { name: 'Search skills' });
  await input.fill('javascrpt');
  await expect(page.getByRole('option').first()).toContainText('JavaScript');
  await input.fill('pyhton');
  await expect(page.getByRole('option')).toHaveCount(0); // Already held.
  await page.keyboard.press('Escape');

});

test('place picker finds a misspelling and retains the selected location', async ({ page }) => {
  await page.goto('/s/python');
  await page.locator('h1').getByRole('button').click();
  const dialog = page.getByRole('dialog', { name: 'Filter', exact: true });
  await dialog.getByRole('button', { name: 'Narrow to a state or city' }).click();
  await page.getByLabel('Search a state, city or region').fill('sydny');
  await page.getByRole('option').filter({ hasText: /^Sydney/ }).first().getByRole('button').click();
  await expect(dialog.getByTestId('filter-readback')).toContainText('Sydney');
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page).toHaveURL(/au-nsw-sydney/);
});

test('admin opts into similar matches and local alias edits update every public search', async ({ page }) => {
  await page.goto('/market');
  await page.getByRole('button', { name: /Preview controls/ }).click();
  await page.getByRole('radio', { name: 'Admin', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.goto('/admin/taxonomy');
  const filter = page.getByLabel('Filter aliases');
  await filter.fill('javascrpt');
  await expect(page.getByText('No aliases match.')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Include similar matches' }).click();
  await expect(page.getByText('Similar match', { exact: true }).first()).toBeVisible();
  await filter.fill('');
  await page.getByLabel('Alias', { exact: true }).fill('snaketool');
  await page.getByLabel('Points to', { exact: true }).selectOption('python');
  await page.getByRole('button', { name: 'Add alias', exact: true }).click();
  await expect(page.getByText('“snaketool” now points to Python', { exact: true })).toBeVisible();
  await page.goto('/search?q=snaketool');
  await expect(page.locator('section[aria-labelledby="results-skill"]').getByRole('link', { name: 'Python', exact: true })).toBeVisible();
  await page.goto('/market?q=snaketool');
  await expect(page.getByRole('link', { name: 'Python', exact: true }).first()).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: 'Search skills and roles' }).fill('snaketol');
  await expect(page.getByRole('option').first()).toContainText('Python');
  await page.keyboard.press('Escape');
  await page.goto('/admin/taxonomy');
  await page.getByLabel('Filter aliases').fill('snaketool');
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByText('Alias removed', { exact: true })).toBeVisible();
  await page.goto('/search?q=snaketool');
  await expect(page.locator('section[aria-labelledby="results-skill"]')).toHaveCount(0);
});

test('practitioner skill filtering retains selections when matching a typo', async ({ page }) => {
  await sampleStudent(page);
  // Only changes the test browser's preview fixture, never a real account.
  await page.evaluate(() => {
    const key = 'sm-preview:v1';
    const db = JSON.parse(localStorage.getItem(key)!);
    const p = db.practitioners[0];
    p.skills = ['python'];
    db.my_practitioner_id = p.id;
    db.session = { user_id: 'u-preview', email: 'test@example.com', display_name: 'Test', personas: ['practitioner'], active: 'practitioner', auth_method: 'magic_link', signed_in_at: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(db));
  });
  await page.goto('/practitioner/join');
  await page.getByRole('button', { name: /Your profile/ }).click();
  await page.getByPlaceholder('Filter skills').fill('javascrpt');
  await expect(page.getByRole('button', { name: 'JavaScript', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Python', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
