import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Assertion-only responsive checks: runs in the `mobile` (375×812) and `tablet` (768×1024) projects. */

async function noSeriousAxe(page: Page) {
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
  '/onboarding?step=start', '/onboarding?step=units', '/onboarding?step=done', '/chat/new?instrument=terraform&signal=rise', '/people',
];

for (const path of PUBLIC) {
  test(`responsive: ${path} has no horizontal overflow and passes axe`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('main h1, main h2').first()).toBeVisible();
    await noHorizontalOverflow(page);
    await noSeriousAxe(page);
  });
}

test.describe('first visit', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test('responsive: /market intro band fits one screen with the board tabs peeking, and passes axe', async ({ page }) => {
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
  await page.goto('/market');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/onboarding');
  if (info.project.name !== 'mobile') {
    await expect(page.getByLabel('University')).toBeVisible();
    return;
  }
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.getByRole('button', { name: /Question 1 of 3/ }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'University' })).toBeVisible();
  await noSeriousAxe(page);
  await sheet.getByRole('combobox').selectOption({ index: 1 });
  await sheet.getByRole('button', { name: /Next question/ }).click();
  await expect(sheet.getByRole('heading', { name: 'Degree' })).toBeVisible();
  await sheet.getByRole('combobox').selectOption({ index: 1 });
  await sheet.getByRole('button', { name: /Next question/ }).click();
  await expect(sheet.getByRole('heading', { name: 'Year of study' })).toBeVisible();
  await sheet.getByRole('combobox').selectOption({ index: 1 });
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toBeHidden();
  await page.getByRole('button', { name: /Show my starting point/ }).click();
  await page.waitForURL(/step=start/);
});
