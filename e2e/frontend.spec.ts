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

const PUBLIC = ['/', '/market', '/market?type=role&view=cards', '/s/rust', '/r/data-engineer', '/compare?a=python&b=java', '/search?q=js', '/metrics/share_of_ads', '/sources', '/people', '/legal/privacy'];

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

test('filter is part of the URL and read back in plain English', async ({ page }) => {
  await page.goto('/s/rust?f=r.au-nt-darwin_graduate_npr');
  await expect(page.getByText(/Showing remote roles in Darwin/).first()).toBeVisible();
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
