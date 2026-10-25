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

test('filter is part of the URL and read back in the title', async ({ page }) => {
  await page.goto('/s/rust?f=r.au-nt-darwin_graduate_npr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Rust\s+in Darwin · Graduate · Remote only · No PR stated/);
  await expect(page.getByText('Not enough ads for a reliable trend')).toBeVisible();
});

test('sample student: desk, skills and gap diagnosis', async ({ page }) => {
  await loadSampleStudent(page);
  await page.goto('/me');
  await expect(page.getByRole('heading', { name: /Sam/, level: 1 })).toBeVisible();
  await expect(page.locator('#signals-h')).toBeVisible();
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
  test('opens on All with name search and no whole-board filter, A–Z pills, measure select or count line', async ({ page }) => {
    await page.goto('/market#board');
    const tabs = page.getByRole('navigation', { name: 'Instrument type' });
    await expect(tabs.getByRole('link')).toHaveText(['Watching', 'All', 'Skills', 'Roles', 'Industries']);
    await expect(tabs.getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'A–Z' })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'A–Z' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Categories' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit filter' })).toHaveCount(0);
    await expect(page.getByLabel('Filter this board by name')).toBeVisible();
    await page.goto('/market?type=skill&sort=az');
    await expect(page.getByText('Job ads', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Measure/ })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Measure' })).toHaveCount(0);
    await expect(page.getByText(/with signals?\b/)).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'By measure' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('radio', { name: 'List' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Compare$/ })).toBeVisible();
  });

  test('Demand column definition explains share of ads without an unnamed figure', async ({ page }) => {
    await page.goto('/market?type=skill');
    await page.getByRole('button', { name: 'What does Demand mean?' }).filter({ visible: true }).first().click();
    const popover = page.getByRole('dialog').filter({ hasText: 'share of ads' });
    await expect(popover).toBeVisible();
    await expect(popover.getByText(/Divided by all ads in this filter/)).toBeVisible();
    await expect(popover.getByText(/appears in [\d.]+% of all/)).toHaveCount(0);
  });

  test('legacy whole-board filters are removed from the URL', async ({ page }) => {
    await page.goto('/market?type=skill&f=r.au-nt-darwin_graduate_npr');
    await expect(page).toHaveURL(/\/market\?type=skill$/);
    await expect(page.getByRole('button', { name: /Filter the whole board/ })).toHaveCount(0);
    await expect(page.getByLabel('Filter this board by name')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reset filter' })).toHaveCount(0);
    await noSeriousAxe(page);
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
  await expect(nav.getByRole('link', { name: 'Market' })).toHaveAttribute('href', '/market#board');
  await expect(nav.getByRole('link', { name: 'Market' })).toHaveAttribute('aria-current', 'page');
});

test('account menu contains one desk entry at every width', async ({ page }) => {
  await loadSampleStudent(page);
  await expect(page.getByRole('banner').getByRole('link', { name: 'My desk' })).toHaveCount(0);
  await page.getByRole('banner').getByRole('button', { name: /My desk/ }).click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'My desk' })).toHaveCount(1);
  await expect(menu.getByRole('menuitem', { name: 'My desk' })).toHaveAttribute('href', '/me');
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

test.describe('landing', () => {
  const INTRO = /A stock market for skills/;
  const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

  test('a deep link through / lands on its board tab without the band', async ({ page }) => {
    await page.goto('/?type=role');
    await expect(page).toHaveURL(/\/market\?type=role$/);
    await expect(page.getByRole('navigation', { name: 'Instrument type' }).getByRole('link', { name: 'Roles' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: INTRO })).toHaveCount(0);
  });

  test('the bare entry always shows the band, signed in or not, with the board tabs peeking below it', async ({ page, context, baseURL }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/market$/);
    await expect(page.getByRole('heading', { level: 2, name: INTRO })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore the market' })).toHaveAttribute('href', '#board');
    await expect(page.getByRole('link', { name: 'Personalise' })).toHaveAttribute('href', '/onboarding');
    await expect(page.getByRole('navigation', { name: 'Instrument type' })).toBeInViewport();
    await page.reload();
    await expect(page.getByRole('heading', { level: 2, name: INTRO })).toBeVisible();
    await context.addCookies([{ name: 'sb-test-auth-token', value: 'x', url: baseURL }]);
    await page.reload();
    await expect(page.getByRole('heading', { level: 2, name: INTRO })).toBeVisible();
  });

  test('one wheel turn flips between the band and the board; further down the board the wheel is native', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/market');
    await page.waitForLoadState('networkidle');
    const box = page.viewportSize();
    await page.mouse.move((box?.width ?? 800) / 2, (box?.height ?? 600) / 2);
    await page.mouse.wheel(0, 100);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(100);
    const anchor = await scrollY(page);
    await expect(page.getByRole('navigation', { name: 'Instrument type' })).toBeInViewport();
    // Past the wheel lock, one turn up goes back to the band.
    await page.waitForTimeout(300);
    await page.mouse.wheel(0, -100);
    await expect.poll(() => scrollY(page)).toBe(0);
    await page.waitForTimeout(300);
    await page.mouse.wheel(0, 100);
    await expect.poll(() => scrollY(page)).toBe(anchor);
    // On the board, down is native.
    await page.waitForTimeout(300);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => scrollY(page)).toBe(anchor + 400);
    await page.waitForTimeout(400);
    expect(await scrollY(page)).toBe(anchor + 400);
  });

  test('changing the board in place keeps the band and the scroll position', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/market');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Explore the market' }).click();
    await expect.poll(() => scrollY(page)).toBeGreaterThan(100);
    const anchor = await scrollY(page);
    await page.waitForTimeout(700);
    await page.getByLabel('Filter this board by name').fill('data');
    await expect(page).toHaveURL(/\/market\?q=data$/);
    await expect(page.getByRole('heading', { level: 2, name: INTRO })).toHaveCount(1);
    expect(await scrollY(page)).toBe(anchor);
    await page.getByRole('radio', { name: 'By change' }).click();
    await expect(page).toHaveURL(/sort=change/);
    await expect(page.getByRole('heading', { level: 2, name: INTRO })).toHaveCount(1);
    expect(await scrollY(page)).toBe(anchor);
    await expect(page.getByRole('navigation', { name: 'Instrument type' })).toBeInViewport();
  });

  test('Explore the market flips to the board; a scroll left mid-way settles the way it set off', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/market');
    const scrollTo = (y: number) => page.evaluate(top => window.scrollTo(0, top), y);
    await page.getByRole('link', { name: 'Explore the market' }).click();
    await expect.poll(() => scrollY(page)).toBeGreaterThan(100);
    const anchor = await scrollY(page);
    await expect(page.getByRole('navigation', { name: 'Instrument type' })).toBeInViewport();
    // Focus follows, like a native in-page anchor.
    await expect(page.locator('#board')).toBeFocused();
    // Snapping stays off for a moment after any focus move or key press.
    await page.waitForTimeout(700);
    // Scrolls that are not a wheel or a touch (scrollbar, find in page) settle. Resting on the board: 60px up flips, 20px springs back.
    await scrollTo(anchor - 20);
    await expect.poll(() => scrollY(page)).toBe(anchor);
    await scrollTo(anchor - 60);
    await expect.poll(() => scrollY(page)).toBe(0);
    // Resting on the band: 20px down springs back, 60px down flips to the board.
    await scrollTo(20);
    await expect.poll(() => scrollY(page)).toBe(0);
    await scrollTo(60);
    await expect.poll(() => scrollY(page)).toBe(anchor);
    // Past the board, scrolling is free.
    await scrollTo(anchor + 200);
    await page.waitForTimeout(400);
    expect(await scrollY(page)).toBe(anchor + 200);
  });

  test('Market in the nav lands on the board under the band; the wordmark goes back to the top', async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/people');
    const market = info.project.name === 'mobile'
      ? page.getByRole('navigation', { name: 'Main' }).filter({ visible: true }).getByRole('link', { name: 'Market' })
      : page.getByRole('banner').getByRole('link', { name: 'Market' });
    await market.click();
    await expect(page).toHaveURL(/\/market#board$/);
    await expect(page.getByRole('heading', { level: 2, name: INTRO })).toHaveCount(1);
    const board = page.getByRole('navigation', { name: 'Instrument type' });
    await expect(board).toBeInViewport();
    await expect.poll(() => scrollY(page)).toBeGreaterThan(100);
    const anchor = await scrollY(page);
    // The pager counts the jump as resting on the board: a small nudge up springs back rather than leaving it mid-way.
    await page.waitForTimeout(700);
    await page.evaluate(top => window.scrollTo(0, top), anchor - 20);
    await expect.poll(() => scrollY(page)).toBe(anchor);
    // The wordmark (named by APP_NAME, so found by its href), from deep in the board, goes back to the top of the landing.
    const wordmark = page.getByRole('banner').locator('a[href="/market"]');
    await page.evaluate(top => window.scrollTo(0, top), anchor + 900);
    await wordmark.click();
    await expect(page).toHaveURL(/\/market$/);
    await expect.poll(() => scrollY(page)).toBe(0);
    await expect(page.getByRole('heading', { level: 2, name: INTRO })).toBeInViewport();
    // And from a board tab.
    await page.goto('/market?type=role');
    await page.evaluate(() => window.scrollTo(0, 600));
    await wordmark.click();
    await expect(page).toHaveURL(/\/market$/);
    await expect(page.getByRole('heading', { level: 2, name: INTRO })).toBeInViewport();
    expect(await scrollY(page)).toBe(0);
  });

  test('keyboard focus and arrow keys are never snapped away', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/market');
    await page.getByRole('link', { name: 'Personalise' }).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(800);
    const y = await scrollY(page);
    expect(y).toBeGreaterThan(0);
    // Left mid-way, the band no longer counts as where the visitor rested: a nudge up goes to the nearer page, not the board.
    await page.evaluate(top => window.scrollTo(0, top), Math.max(2, y - 10));
    await expect.poll(() => scrollY(page)).toBe(0);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(800);
    await expect(page.locator(':focus')).toBeInViewport();
  });

  test('landing heatmap tiles are labelled links to industry pages', async ({ page }, info) => {
    await page.goto('/market');
    await expect(page.getByRole('table').filter({ hasText: 'Industries by job ads' })).toHaveCount(1);
    test.skip(info.project.name === 'mobile', 'Tiles are hidden on phones; the table remains');
    const map = page.getByRole('list', { name: /Industries by job ads/ }).filter({ visible: true });
    const tile = map.getByRole('link', { name: /^Mining: [\d,]+ job ads/ });
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAttribute('aria-label', /4.week|up|down|unchanged/i);
    await tile.click();
    await expect(page).toHaveURL(/\/i\/mining$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Mining\s+in All Australia/);
    await expect(page.getByText('ANZSIC Division B')).toBeVisible();
  });
});

test.describe('industries', () => {
  test('Industries tab lists ANZSIC divisions by Demand', async ({ page }) => {
    await page.goto('/market');
    const tab = page.getByRole('navigation', { name: 'Instrument type' }).getByRole('link', { name: 'Industries' });
    await expect(tab).toHaveAttribute('href', '/market?type=industry');
    // Follow the link directly: a click before hydration can be lost under load.
    await page.goto('/market?type=industry');
    await expect(page.getByRole('navigation', { name: 'Instrument type' }).getByRole('link', { name: 'Industries' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByText('Job ads', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Health Care and Social Assistance' }).first()).toBeVisible();
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
    await expect(page.getByRole('rowheader', { name: 'AutoCAD' })).toHaveCount(1);
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
