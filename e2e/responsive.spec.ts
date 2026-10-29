import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Assertion-only responsive checks: runs in the `mobile` (375×812) and `tablet` (768×1024) projects. */

async function noSeriousAxe(page: Page) {
  // Audit the settled UI, not partially transparent sheet/toast entry frames.
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished.catch(() => {})));
  });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

async function noHorizontalOverflow(page: Page) {
  const r = await page.evaluate(() => {
    const vw = window.innerWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>('body *')]
      .filter(el => {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.right <= vw + 1) return false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return false;
        return true;
      })
      .slice(0, 5)
      .map(el => `${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')}`);
    return { fits: document.documentElement.scrollWidth <= vw, offenders };
  });
  expect(r.fits, `${page.url()}: horizontal overflow; widest: ${r.offenders.join(', ')}`).toBe(true);
}

async function loadSampleStudent(page: Page) {
  await page.goto('/market');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /Preview controls/ }).click();
  await page.getByRole('button', { name: /Load a sample student/ }).click();
  await page.keyboard.press('Escape');
}

const PUBLIC = [
  '/', '/market', '/market?type=role', '/market?type=role&view=cards', '/market?f=r.au-nt-darwin_graduate_npr',
  '/s/rust', '/s/python', '/s/sql?y=salary&by=mode', '/s/rust?f=r.au-nt-darwin_graduate_npr', '/r/data-engineer', '/compare?a=python&b=java', '/search?q=js', '/metrics', '/metrics/share_of_ads',
  '/sources', '/people', '/legal/privacy', '/legal/terms', '/legal/conduct', '/onboarding', '/auth/login',
];

const SIGNED_IN = [
  '/me', '/me/skills', '/me/gap?role=data-engineer', '/me/requests', '/me/settings',
  '/onboarding?step=start', '/onboarding?step=done', '/chat/new?instrument=terraform&signal=rise', '/people',
];

for (const path of PUBLIC) {
  test(`responsive: ${path} has no horizontal overflow and passes axe`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('main h1, main h2').first()).toBeVisible();
    await noHorizontalOverflow(page);
    await noSeriousAxe(page);
  });
}

test.describe('landing', () => {
  test('responsive: /market landing band fits one screen with the board tabs peeking, and passes axe', async ({ page }) => {
    await page.goto('/market');
    await expect(page.getByRole('heading', { level: 2, name: /A stock market for skills/ })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Instrument type' })).toBeInViewport();
    await noHorizontalOverflow(page);
    await noSeriousAxe(page);
  });
});

test('responsive: signed-in demo routes fit the viewport and pass axe', async ({ page }) => {
  test.setTimeout(120_000);
  await loadSampleStudent(page);
  for (const path of SIGNED_IN) {
    await test.step(path, async () => {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      await noHorizontalOverflow(page);
      await noSeriousAxe(page);
    });
  }
});

async function viewAs(page: Page, role: 'Practitioner' | 'Admin') {
  await page.goto('/market');
  await page.getByRole('button', { name: /Preview controls/ }).click();
  await page.getByRole('dialog').getByText(role, { exact: true }).click();
  await page.keyboard.press('Escape');
}

const ROLE_ROUTES = { Practitioner: ['/practitioner', '/practitioner/join'], Admin: ['/admin', '/admin/metrics', '/admin/pipeline', '/admin/taxonomy', '/admin/review', '/admin/reports'] } as const;

for (const role of ['Practitioner', 'Admin'] as const) {
  test(`responsive: ${role.toLowerCase()} routes fit the viewport and pass axe`, async ({ page }) => {
    test.setTimeout(120_000);
    await viewAs(page, role);
    for (const path of ROLE_ROUTES[role]) {
      await test.step(path, async () => {
        await page.goto(path);
        await expect(page.locator('main h1, main h2').first()).toBeVisible();
        await noHorizontalOverflow(page);
        await noSeriousAxe(page);
      });
    }
  });
}

test('onboarding basics: one question per bottom sheet on phones, inline fields otherwise', async ({ page }, info) => {
  await signInForOnboarding(page);
  if (info.project.name !== 'mobile') {
    await expect(page.getByRole('combobox', { name: 'University' })).toBeVisible();
    return;
  }
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.getByRole('button', { name: /Question 1 of 3/ }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'University' })).toBeVisible();
  await noSeriousAxe(page);
  await sheet.getByRole('combobox').click();
  await sheet.getByRole('option').first().click();
  await sheet.getByRole('button', { name: /Next question/ }).click();
  await expect(sheet.getByRole('heading', { name: 'Degree' })).toBeVisible();
  await sheet.getByRole('combobox').click();
  await sheet.getByRole('option').first().click();
  await sheet.getByRole('button', { name: /Next question/ }).click();
  await expect(sheet.getByRole('heading', { name: 'Year of study' })).toBeVisible();
  await sheet.getByRole('combobox').selectOption({ index: 1 });
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toBeHidden();
  await page.getByRole('button', { name: /Show my starting point/ }).click();
  await page.waitForURL(/step=start/);
});


test('onboarding review: degree heading, skill actions and clickable steps', async ({ page }) => {
  await loadSampleStudent(page);
  await page.goto('/onboarding?step=start');
  await expect(page.getByRole('heading', { level: 1, name: 'Bachelor of Advanced Computing', exact: true })).toBeVisible();
  const progress = page.getByRole('navigation', { name: 'Setup progress' });
  await expect(progress.getByRole('button', { name: '2 Skills', exact: true })).toHaveAttribute('aria-current', 'step');
  const skills = page.locator('section[aria-labelledby="mb-start"]');
  await expect(skills.getByText('Job ads', { exact: true })).toHaveCount(0);
  await expect(skills.getByText(/job ads in/)).toHaveCount(0);
  await expect(skills.getByRole('button', { name: /^Watch (?!all$)/ }).first()).toBeVisible();
  await expect(skills.getByRole('button', { name: 'Watch all', exact: true })).toBeVisible();
  await expect(page.locator('#mb-roles, #mb-next')).toHaveCount(0);
  const remove = skills.locator('[data-remove]').first();
  await expect(remove).toHaveClass(/border-danger/);
  const slug = await remove.getAttribute('data-remove');
  await remove.focus();
  await page.keyboard.press('Enter');
  await expect(skills.locator(`[data-remove="${slug}"]`)).toHaveCount(0);
  await expect(skills.locator('[data-remove]').first()).toBeFocused();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(skills.locator(`[data-remove="${slug}"]`)).toBeVisible();
  await skills.getByRole('button', { name: 'Watch all', exact: true }).click();
  await expect(skills.getByRole('button', { name: 'All watched', exact: true })).toBeDisabled();
  await progress.getByRole('button', { name: '1 Basics (done)', exact: true }).click();
  await expect(progress.getByRole('button', { name: '1 Basics', exact: true })).toHaveAttribute('aria-current', 'step');
  await progress.getByRole('button', { name: '2 Skills', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bachelor of Advanced Computing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'See my board', exact: true }).click();
  await expect(progress.getByRole('button', { name: '3 Your board', exact: true })).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#mb-start')).toHaveCount(0);
  for (const section of ['mb-roles', 'mb-next']) {
    const group = page.locator(`section[aria-labelledby="${section}"]`);
    await expect(group.getByRole('button', { name: 'Watch all', exact: true })).toBeVisible();
    await group.getByRole('button', { name: 'Watch all', exact: true }).click();
    await expect(group.getByRole('button', { name: 'All watched', exact: true })).toBeDisabled();
  }
  await expect(page.getByRole('main').getByRole('link', { name: 'Explore the market', exact: true })).toHaveAttribute('href', '/market');
  await noHorizontalOverflow(page);
  await noSeriousAxe(page);

  await progress.getByRole('button', { name: '2 Skills (done)', exact: true }).click();
  await expect(page).toHaveURL(/step=start/);
  await noHorizontalOverflow(page);
  await noSeriousAxe(page);
});


async function signInForOnboarding(page: Page) {
  await page.goto('/onboarding');
  await expect(page).toHaveURL(/auth\/login\?next=%2Fonboarding/);
  await page.getByLabel('Email', { exact: true }).fill('onboarding.test@example.com');
  await page.getByRole('checkbox', { name: 'I’m 18 or older', exact: true }).check();
  await page.getByRole('checkbox', { name: 'I’ve read the privacy notice', exact: true }).check();
  await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
  await page.getByRole('link', { name: 'Open the link from the preview outbox', exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole('navigation', { name: 'Setup progress' })).toBeVisible();
  await noHorizontalOverflow(page);
  await noSeriousAxe(page);
}

test('get started requires email sign-in before personalising', async ({ page }) => {
  await signInForOnboarding(page);
});
