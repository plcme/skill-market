import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function noSeriousAxe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

async function fitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function loadSampleStudent(page: Page) {
  await page.goto('/market');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /Preview controls/ }).click();
  await page.getByRole('button', { name: /Load a sample student/ }).click();
  await page.keyboard.press('Escape');
}

const PUBLIC = ['/', '/market', '/market?type=industry', '/i/health-care', '/compare?a=mining&b=construction', '/market?type=role&view=cards', '/s/rust', '/r/data-engineer', '/compare?a=python&b=java', '/search?q=js', '/metrics/share_of_ads', '/sources', '/people', '/legal/privacy'];

for (const path of PUBLIC) {
  test(`public page ${path} renders, fits and passes axe`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await fitsViewport(page);
    await noSeriousAxe(page);
  });
}

test('unknown instrument is a 404', async ({ page }) => {
  expect((await page.goto('/s/not-a-skill'))?.status()).toBe(404);
});

test('filter is part of the URL and read back in the title and chips', async ({ page }) => {
  await page.goto('/s/rust?f=r.au-nt-darwin_graduate_npr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Rust\s+in Darwin/);
  const chips = page.getByRole('list', { name: 'Also filtered by' });
  await expect(chips.getByRole('listitem')).toHaveText(['Graduate only', 'No PR or citizenship stated', 'Work mode: Remote']);
  await expect(page.getByText('Not enough ads for a reliable trend')).toBeVisible();
});

test('sample student: desk, skills and gap diagnosis', async ({ page }) => {
  await loadSampleStudent(page);
  await page.goto('/me');
  await expect(page.getByRole('heading', { name: /Sam/, level: 1 })).toBeVisible();
  await expect(page.getByText('Signals on your watchlist')).toBeVisible();
  await fitsViewport(page);
  await noSeriousAxe(page);
  await page.goto('/me/gap?role=data-engineer');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Data Engineer');
  await noSeriousAxe(page);
});

test('signal → coffee-chat request → sent', async ({ page }) => {
  await loadSampleStudent(page);
  await page.goto('/chat/new?instrument=terraform&signal=rise');
  await page.getByLabel(/The decision you/).fill('Should I take the cloud elective next semester or a data one?');
  await page.getByRole('button', { name: /Find people/ }).click();
  await page.getByRole('button', { name: /^Choose / }).first().click();
  await page.locator('fieldset button').first().click();
  await page.getByRole('checkbox', { name: /respectful/ }).click();
  await page.getByRole('button', { name: /Send request/ }).click();
  await page.waitForURL(/\/chat\/cr-/);
  await expect(page.getByText(/Sent/).first()).toBeVisible();
  await noSeriousAxe(page);
});

test('signed-out visitors are asked to sign in on private pages', async ({ page }) => {
  await page.goto('/market');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/me');
  await expect(page.getByText('Sign in to see this page')).toBeVisible();
});

test.describe('market board', () => {
  test('opens on All with the Filter button, search first and no A–Z or category pills', async ({ page }) => {
    await page.goto('/market');
    const tabs = page.getByRole('navigation', { name: 'Instrument type' });
    await expect(tabs.getByRole('link')).toHaveText(['All', 'Skills', 'Roles', 'Industries']);
    await expect(tabs.getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'A–Z' })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'A–Z' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Categories' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit filter' })).toHaveCount(0);
    await expect(page.getByLabel('Filter this board by name')).toBeVisible();
    await page.goto('/market?type=skill&sort=az');
    await expect(page.getByText('Job ads', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Measure\s*Demand/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'By measure' })).toHaveAttribute('aria-checked', 'true');
  });

  test('Demand column definition explains share of ads without an unnamed figure', async ({ page }) => {
    await page.goto('/market?type=skill');
    await page.getByRole('button', { name: 'What does Demand mean?' }).filter({ visible: true }).first().click();
    const popover = page.getByRole('dialog').filter({ hasText: 'share of ads' });
    await expect(popover).toBeVisible();
    await expect(popover.getByText(/Divided by all ads in this filter/)).toBeVisible();
    await expect(popover.getByText(/appears in [\d.]+% of all/)).toHaveCount(0);
  });

  test('Filter button opens the builder and shows the scope when active', async ({ page }) => {
    test.slow();
    await page.goto('/market?f=r.au-nt-darwin_graduate_npr');
    const button = page.getByRole('button', { name: /Filter the whole board, 3 conditions active/ });
    await expect(button).toBeVisible();
    await expect(page.getByText(/Showing remote roles in Darwin/).first()).toBeVisible();
    await button.click();
    await expect(page.getByRole('dialog', { name: 'Filter' })).toBeVisible();
    await noSeriousAxe(page);
    await page.keyboard.press('Escape');
    const reset = page.getByRole('link', { name: 'Reset filter' });
    await expect(reset).toHaveAttribute('href', '/market');
    // The click can land before hydration under load; retry until the URL changes.
    await expect(async () => {
      if (!/\/market$/.test(page.url())) await reset.click({ timeout: 5000 });
      await expect(page).toHaveURL(/\/market$/, { timeout: 10000 });
    }).toPass({ timeout: 40000 });
    await expect(page.getByRole('button', { name: 'Filter the whole board' })).toBeVisible();
  });

  test('select two skills on the board and compare them', async ({ page }) => {
    await page.goto('/market?type=skill');
    await page.getByRole('button', { name: /^Compare$/ }).click();
    await page.getByRole('checkbox', { name: 'Select Python to compare' }).click();
    await expect(page.getByRole('button', { name: 'Compare (1)' })).toBeDisabled();
    await page.getByRole('checkbox', { name: 'Select SQL to compare' }).click();
    await expect(page.getByRole('checkbox', { name: 'Select Java to compare' })).toBeDisabled();
    await noSeriousAxe(page);
    await page.getByRole('link', { name: 'Compare (2)' }).click();
    await page.waitForURL(/\/compare\?a=python&b=sql/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test('theme toggle has two states, follows the device by default and remembers a choice', async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/market');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  // On phones the toggle lives in the menu sheet.
  if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Theme: Dark. Switch to Light' }).filter({ visible: true }).click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(page.getByText('System', { exact: true })).toHaveCount(0);
});

test('primary nav is Market and People; Sources sits in the footer', async ({ page }, info) => {
  await page.goto('/');
  const footer = page.getByRole('navigation', { name: 'Data & safety' });
  await expect(footer.getByRole('link', { name: 'Sources & methods' })).toHaveAttribute('href', '/sources');
  test.skip(info.project.name === 'mobile', 'Primary nav is in the menu sheet on phones');
  const nav = page.getByRole('banner').getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link')).toHaveText(['Market', 'Coffee chats']);
});

test('account menu does not repeat My desk', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Avatar menu is desktop-only');
  await loadSampleStudent(page);
  await expect(page.getByRole('banner').getByRole('link', { name: 'My desk' })).toBeVisible();
  await page.getByRole('button', { name: 'Account' }).click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'My desk' })).toHaveCount(0);
});

test('settings offer Light / Dark and a way back to matching the device', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await loadSampleStudent(page);
  await page.goto('/me/settings');
  const theme = page.getByRole('radiogroup', { name: 'Theme' });
  await expect(theme.getByRole('radio')).toHaveText(['Light', 'Dark']);
  await expect(theme.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: 'Match my device' })).toHaveCount(0);
  await theme.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Match my device' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.getItem('sm-theme'))).toBeNull();
});

test.describe('industries', () => {
  test('Industries tab lists ANZSIC divisions by Demand', async ({ page }) => {
    await page.goto('/market');
    const tab = page.getByRole('navigation', { name: 'Instrument type' }).getByRole('link', { name: 'Industries' });
    await expect(tab).toHaveAttribute('href', '/market?type=industry');
    // Follow the link directly: a click before hydration can be lost under load.
    await page.goto('/market?type=industry');
    await expect(page.getByRole('navigation', { name: 'Instrument type' }).getByRole('link', { name: 'Industries' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: /Measure\s*Demand/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Health Care and Social Assistance' }).first()).toBeVisible();
  });

  test('landing heatmap tiles are labelled links to industry pages', async ({ page }) => {
    await page.goto('/');
    const map = page.getByRole('list', { name: /Industries by job ads/ }).filter({ visible: true });
    const tile = map.getByRole('link', { name: /^Mining: [\d,]+ job ads/ });
    await expect(tile).toBeVisible();
    await expect(page.getByText('Size:').first()).toBeVisible();
    await expect(page.getByText('Colour:').first()).toBeVisible();
    await tile.click();
    await expect(page).toHaveURL(/\/i\/mining$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Mining\s+in All Australia/);
    await expect(page.getByText('ANZSIC Division B')).toBeVisible();
  });

  test('movers carousel states its rule, advances and can pause', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByText(/biggest 4-week changes, up or down/)).toBeVisible();
    const carousel = page.getByRole('region', { name: 'Biggest 4-week moves' });
    await expect(carousel.getByRole('button', { name: 'Resume rotation' })).toBeVisible();
    const first = await carousel.getByRole('heading', { level: 3 }).textContent();
    await carousel.getByRole('button', { name: 'Next move' }).click();
    await expect(carousel.getByRole('heading', { level: 3 })).not.toHaveText(first ?? '');
    await expect(carousel.getByText(/^Ads (mentioning|for|in) .+ (rose|fell) [\d,]+ → [\d,]+ in 4 weeks\.$/).first()).toBeVisible();
  });

  test('industry page shows skills as a heatmap and a labelled list, plus a way to talk', async ({ page }) => {
    await page.goto('/i/construction');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Construction\s+in All Australia/);
    const map = page.getByRole('list', { name: /Skills in Construction/ }).filter({ visible: true });
    await expect(map.getByRole('link', { name: /^AutoCAD: / })).toBeVisible();
    await expect(page.getByText('Share of this industry’s ads mentioning each skill')).toBeVisible();
    await expect(page.getByText(/in \d+% of these ads/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Talk to someone working in this industry/ })).toBeVisible();
    await expect(page.getByText('Median salary')).toHaveCount(0);
    await page.getByText('Show these numbers as a table').click();
    await expect(page.getByRole('rowheader', { name: 'AutoCAD' })).toBeVisible();
  });

  test('a role opened under /i/ redirects to /r/', async ({ page }) => {
    await page.goto('/i/data-engineer');
    await expect(page).toHaveURL(/\/r\/data-engineer$/);
  });
});

test('role page lists its Top holdings with weights', async ({ page }) => {
  await page.goto('/r/data-engineer');
  await expect(page.getByText('Top holdings')).toBeVisible();
  const holdings = page.locator('section[aria-labelledby="comp-h"]');
  await expect(holdings.getByRole('link', { name: 'SQL' })).toBeVisible();
  await expect(holdings.getByText('in 85% of these ads')).toBeVisible();
});
