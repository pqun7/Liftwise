import { expect, test } from '@playwright/test';
import { finishBuilder } from './programHelpers';
import { finishLogger } from './workoutUi';

test('Plan, Program, calendar and Workout share a durable cycle with summary-only session state', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/plan');
  await expect(page.getByRole('heading', { name: 'Build your training week' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Details', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Build your training week' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('existing-empty.png'), fullPage: true });
  await page.getByRole('link', { name: 'Create program', exact: true }).click();
  await page.getByLabel('Program name').fill('Cycle QA');
  await page.getByRole('radio', { name: /Flexible Cycle/ }).check();
  await page.getByRole('button', { name: 'Continue to Template' }).click();
  await page.getByRole('button', { name: /^Custom/ }).click();
  await page.getByRole('button', { name: 'Next: Schedule' }).click();
  await page.getByRole('button', { name: 'Add Recovery Day' }).click();
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await page.getByRole('link', { name: 'Add exercise', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Barbell Bench Press');
  await page.getByRole('button', { name: /Add Barbell Bench Press to/ }).click();
  await finishBuilder(page);
  await expect(page.getByRole('heading', { name: 'Program ready' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Start Workout/ })).toHaveCount(0);
  await page.getByRole('link', { name: 'Set Schedule', exact: true }).click();
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  await page.getByLabel('Cycle start date').fill(today);
  await page.getByRole('button', { name: 'Save Schedule' }).click();
  await expect(page.getByRole('link', { name: /View in Workout/ })).toBeVisible();
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`schedule-${width}.png`), fullPage: true });
  }
  await page.getByRole('link', { name: 'Open calendar' }).click();
  await expect(page.locator('.calendar-day-marker[data-status="scheduled"]')).not.toHaveCount(0);
  await expect(page.locator('.calendar-day-marker[data-status="rest"]')).not.toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('calendar.png'), fullPage: true });
  await page
    .getByRole('link', { name: new RegExp('Workout day$') })
    .first()
    .click();
  await expect(page.getByRole('link', { name: /View in Workout/ })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Calendar' }).click();
  await page.getByRole('link', { name: 'Back to Schedule' }).click();
  await page.getByRole('radio', { name: 'Details', exact: true }).click();
  await expect(page.locator('.plan-active-card')).not.toContainText('Next workout');
  await page.getByRole('link', { name: 'View program details' }).click();
  await expect(page.getByRole('heading', { name: 'Program Cycle' })).toBeVisible();
  await page.getByRole('link', { name: /Workout Day 1/ }).click();
  await expect(page.getByText('Program preview', { exact: false })).toBeVisible();
  const previewUrl = page.url();
  await expect(page.getByLabel('Set 1 reps')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('day-preview.png'), fullPage: true });
  await page.getByRole('link', { name: 'Workout', exact: true }).click();
  await expect(page).toHaveURL(/\/workout$/);
  await expect(page.getByRole('heading', { name: 'Start training' })).toBeVisible();
  await page.getByRole('link', { name: 'Plan', exact: true }).click();
  await expect(page).toHaveURL(previewUrl);
  await page.goto('/plan');
  await page.getByRole('link', { name: /View in Workout/ }).click();
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
  const logger = page.getByRole('region', { name: 'Set logger' });
  await expect(logger).toBeVisible();
  const sessionUrl = page.url();
  await logger.getByLabel('Set 1 weight', { exact: true }).fill('40');
  await logger.getByLabel('Set 1 reps', { exact: true }).fill('8');
  await logger.getByRole('button', { name: 'Complete set', exact: true }).click();
  await expect(page.locator('.workout-session-status')).toContainText('1/3 sets completed');
  await page.goto('/plan');
  await expect(page.getByText(/1 \/ 3 sets/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Set logger' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Rest timer' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('active-summary.png'), fullPage: true });
  await page.getByRole('link', { name: /Continue in Workout/ }).click();
  await expect(page).toHaveURL(sessionUrl);
  await finishLogger(page);
  await page.goto('/plan');
  await expect(page.getByRole('link', { name: 'View Summary', exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Open calendar' }).click();
  await expect(page.locator('a .calendar-day-marker[data-status="completed"]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('a .calendar-day-marker[data-status="completed"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});
