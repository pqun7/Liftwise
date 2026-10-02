import { expect, test, type Page } from '@playwright/test';
import { setOffline } from './offline';
import { saveEmptyProgram } from './programHelpers';

async function dismissStatus(page: Page) {
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
}

async function auditHome(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  for (const selector of ['.home-primary', '.home-day', '.home-local', '.bottom-nav .nav-item']) {
    for (const locator of await page.locator(selector).all()) {
      const box = await locator.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  }
  await expect(page.locator('.home-hero-image')).toHaveJSProperty('complete', true);
  await expect
    .poll(() =>
      page
        .locator('.home-hero-image')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
}

test('Home adapts to local program, active workout and rest states with cached photography', async ({
  page,
  context,
  browserName,
}, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('[data-home-state=rest-day]')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await dismissStatus(page);
  await auditHome(page);
  await page.locator('.home-hero').getByRole('link', { name: 'Create Program' }).click();
  await page.getByLabel('Program name').fill('Push Pull Legs');
  await saveEmptyProgram(page);
  await page.getByRole('link', { name: '+ Day' }).click();
  await page.getByLabel('Day name').fill('Push Day');
  await page.getByRole('button', { name: 'Add day' }).press('Enter');
  await page.getByRole('link', { name: 'Add exercise', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Barbell Bench Press');
  await page
    .getByRole('link', { name: /Barbell Bench Press/ })
    .first()
    .click();
  await page.getByLabel('Target sets').fill('3');
  await page.getByRole('button', { name: 'Add to day' }).press('Enter');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('[data-home-state=scheduled]')).toBeVisible();
  await expect(page.locator('.home-hero')).toContainText('1 exercise · 3 planned sets');
  await dismissStatus(page);
  await auditHome(page);
  const path = testInfo.outputPath('home-scheduled.png');
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach('Scheduled Home', { path, contentType: 'image/png' });
  // One compact matrix for layout, with all seven 44px day targets retained in a local scroller.
  if (browserName === 'webkit') {
    for (const width of [320, 375, 390, 393, 402, 414, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await auditHome(page);
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }
  const days = page.getByRole('group', { name: 'Select a day this week' });
  const today = days.getByRole('button', { name: /today,/ });
  // Select a non-today date, even when the test runs on a Monday.
  const notToday = days.locator('button:not([aria-pressed=true])').first();
  await notToday.click();
  await expect(page.locator('[data-home-state=rest-day]')).toBeVisible();
  await expect(page.getByText('No workouts recorded or scheduled for this date.')).toBeVisible();
  await today.click();
  await expect(page.locator('[data-home-state=scheduled]')).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(page.locator('.home-frame')).toHaveCSS('width', '430px');
  await expect(page.locator('.bottom-nav')).toHaveCSS('width', '430px');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
  await page.getByLabel('Set 1 weight', { exact: true }).fill('100');
  await page.getByLabel('Set 1 reps', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Complete set', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Completed', exact: true })).toHaveCount(1);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('[data-home-state=in-progress]')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
  await expect(page.getByText('0 of 1 exercise · 2 sets left')).toBeVisible();
  await auditHome(page);
  await page.screenshot({ path: testInfo.outputPath('home-in-progress.png'), fullPage: true });
  // All three decorative photos are tiny bundled shell assets, not the optional RepDB pack.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const paths = (
          await Promise.all(
            (await caches.keys())
              .filter((key) => key.includes('precache'))
              .map(async (key) =>
                (await (await caches.open(key)).keys()).map((request) => request.url),
              ),
          )
        ).flat();
        return paths.filter((url) => /\/assets\/.*\.webp/.test(url)).length;
      }),
    )
    .toBe(3);
  await setOffline(context, browserName, true);
  try {
    if (browserName !== 'webkit') await page.reload();
    await page.getByRole('link', { name: 'Continue Workout', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Completed', exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: 'Finish Workout' }).click();
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page.locator('[data-home-state=rest-day]')).toBeVisible();
    await expect(page.getByRole('link', { name: /Push Day.*1 completed set/ })).toBeVisible();
    await auditHome(page);
    await page.screenshot({ path: testInfo.outputPath('home-rest-day.png'), fullPage: true });
    await page.getByRole('link', { name: /Upper Body Explore exercises/ }).click();
    await expect(page.getByLabel('Body part')).toHaveValue('chest');
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await page.getByRole('link', { name: /Recovery & Mobility/ }).click();
    await expect(page.getByRole('searchbox', { name: 'Search exercises' })).toHaveValue('stretch');
  } finally {
    await setOffline(context, browserName, false);
  }
  expect(errors).toEqual([]);
});
