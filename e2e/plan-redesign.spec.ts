import { expect, test } from '@playwright/test';
import { finishBuilder } from './programHelpers';

test('unified Plan shows real training and recovery states and shares the Home week', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date(2026, 9, 11, 12));
  await page.goto('/plan');
  await expect(page.getByRole('heading', { name: 'Build your training week' })).toBeVisible();
  await expect(page.locator('.plan-page img')).toHaveCount(1);
  await expect(page.locator('.plan-empty-artwork')).toHaveAttribute('src', /program-orb.*\.webp/);
  await page.screenshot({ path: testInfo.outputPath('empty.png'), fullPage: true });
  await page.getByRole('link', { name: 'Create program', exact: true }).click();
  await page.getByLabel('Program name').fill('Balanced Strength');
  await page.getByRole('button', { name: 'Continue to Template' }).click();
  await page.getByRole('button', { name: /Upper \/ Lower/ }).click();
  await page.getByRole('button', { name: 'Next: Schedule' }).click();
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await finishBuilder(page);
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
  await expect(page.getByRole('heading', { name: 'Recovery Day' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible();
  await expect(page.locator('.plan-current-card')).toContainText('Balanced Strength');
  await expect(page.locator('.plan-current-card img')).toHaveCount(0);
  await expect(page.locator('.plan-page img')).toHaveCount(1);
  await expect(page.locator('.plan-recovery-art')).toHaveAttribute('src', /recovery-bed.*\.webp/);
  await expect(page.locator('.week-selector-detailed .calendar-day')).toHaveCount(7);
  await expect(page.locator('.week-selector-detailed [data-training="true"]')).toHaveCount(4);
  await page.screenshot({ path: testInfo.outputPath('recovery.png'), fullPage: true });
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const cells = page.locator('.week-selector-detailed .calendar-day');
    for (const cell of await cells.all()) {
      const box = await cell.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('radio', { name: 'Details' }).click();
  await expect(page.locator('.plan-page img')).toHaveCount(1);
  await expect(page.locator('.plan-details-art')).toHaveAttribute(
    'src',
    /program-dumbbell.*\.webp/,
  );
  await expect(page.getByRole('link', { name: 'Edit program', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View program details', exact: true })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Create another program', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('details.png'), fullPage: true });
  await page.clock.setFixedTime(new Date(2026, 9, 12, 12));
  await page.goto('/plan');
  await expect(page.getByRole('link', { name: 'View in Workout' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('training.png'), fullPage: true });
  const planStatuses = await page
    .locator('.calendar-day')
    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-status')));
  const planFont = await page
    .locator('h1')
    .evaluate((heading) => getComputedStyle(heading).fontFamily);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('.home-week .calendar-day')).toHaveCount(7);
  const homeStatuses = await page
    .locator('.home-week .calendar-day')
    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-status')));
  expect(homeStatuses).toEqual(planStatuses);
  expect(
    await page.locator('h1').evaluate((heading) => getComputedStyle(heading).fontFamily),
  ).toEqual(planFont);
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });
  expect(errors).toEqual([]);
});
