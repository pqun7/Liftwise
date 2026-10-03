import { expect, test } from '@playwright/test';
import { saveEmptyProgram } from './programHelpers';
import { finishLogger, expectProgressCounts } from './workoutUi';

test('focused logger preserves decimal sets, rest, prefill, recovery and canonical history', async ({
  page,
}, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/exercises/new');
  await page.getByLabel('Name', { exact: true }).fill('Logger Row');
  await page.getByLabel('Primary muscle').fill('Back');
  await page.getByLabel('Primary muscle').press('Enter');
  await expect(page.getByRole('heading', { name: 'Logger Row', exact: true })).toBeVisible();
  await page.goto('/plan/new');
  await page.getByLabel('Program name').fill('Logger Strength');
  await saveEmptyProgram(page);
  await page.getByRole('link', { name: 'Add training day' }).click();
  await page.getByLabel('Day name').fill('Push Day');
  await page
    .getByLabel('Weekday', { exact: true })
    .selectOption(String(await page.evaluate(() => (new Date().getDay() + 6) % 7)));
  await page.getByRole('button', { name: 'Add day', exact: true }).click();
  await page.getByRole('link', { name: 'Add exercise', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Barbell Bench Press');
  await page
    .getByRole('link', { name: /Barbell Bench Press/ })
    .first()
    .click();
  await page.getByLabel('Target sets').fill('3');
  await page.getByLabel('Rest duration in seconds').fill('180');
  await page.getByRole('button', { name: 'Add to day' }).click();
  await expect(page.getByRole('heading', { name: 'Push Day', exact: true })).toBeVisible();
  await expect(page.getByText('3 sets · 6–8 reps · 1–2 RIR', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Add exercise', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Logger Row');
  await page.getByRole('link', { name: /Logger Row/ }).click();
  await page.getByLabel('Target sets').fill('1');
  await page.getByRole('button', { name: 'Add to day' }).click();
  await expect(page.getByRole('heading', { name: 'Push Day', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Logger Row', exact: true })).toBeVisible();
  await page.goto('/workout');
  await expect(page.getByRole('heading', { name: 'Workout preview' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(1);
  await expect(page.locator('input, textarea, select')).toHaveCount(0);
  for (const width of [375, 390, 393, 402, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: testInfo.outputPath('workout-landing.png'), fullPage: true });
  await page.getByRole('button', { name: /Push Day/ }).click();
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
  const logger = page.getByRole('region', { name: 'Set logger' });
  await expect(page.getByRole('heading', { name: 'Push Day', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(0);
  await expect(page.getByText('No previous workout data')).toBeVisible();
  for (const width of [320, 375, 390, 393, 402, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const control of await logger.locator('input').all()) {
      expect(
        await control.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
      ).toBeGreaterThanOrEqual(16);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await logger.getByLabel('Set 1 weight', { exact: true }).fill('62.5');
  await logger.getByLabel('Set 1 reps', { exact: true }).fill('8');
  await logger.getByLabel('Set 1 RIR', { exact: true }).fill('3');
  await logger.getByRole('button', { name: 'Set 1 weight plus 2.5' }).click();
  await expect(logger.getByLabel('Set 1 weight', { exact: true })).toHaveValue('65');
  await logger.getByRole('button', { name: 'Complete set', exact: true }).click();
  await expect(
    logger.getByRole('button', { name: 'Completed', exact: true, includeHidden: true }),
  ).toHaveCount(1);
  await expect(page.getByText('Next: Set 2', { exact: true })).toBeVisible();
  // Busy equipment: jump without skipping or changing the unfinished work, then return.
  await page
    .getByRole('combobox', { name: 'Jump to exercise' })
    .selectOption({ label: '2. Logger Row · 0/1 sets' });
  await expect(page.getByRole('heading', { name: 'Logger Row', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Rest timer' })).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Jump to exercise' })
    .selectOption({ label: '1. Barbell Bench Press · 1/3 sets' });
  await expect(logger.getByLabel('Set 2 weight', { exact: true })).toHaveValue('65');
  await expect(logger.getByLabel('Set 2 reps', { exact: true })).toHaveValue('8');
  await page.getByRole('button', { name: 'Undo completion' }).click();
  await expect(logger.getByRole('heading', { name: 'Set 1 of 3' })).toBeVisible();
  await logger.getByRole('button', { name: 'Complete set', exact: true }).click();
  await expect(logger.getByRole('heading', { name: 'Set 2 of 3' })).toBeVisible();
  await page.getByLabel('Workout menu', { exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByLabel('Workout menu', { exact: true }).click();
  await expect(logger.getByLabel('Set 2 weight', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Resume Workout', exact: true }).click();
  await expect(logger.getByLabel('Set 2 weight', { exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Add 30 Seconds' }).click();
  await page.reload();
  await expect(logger.getByLabel('Set 1 weight', { exact: true })).toHaveValue('65');
  await expect(
    logger.getByRole('button', { name: 'Completed', exact: true, includeHidden: true }),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Skip Rest Timer' }).click();
  await expect(page.getByRole('region', { name: 'Rest timer' })).toHaveCount(0);
  for (const number of [2, 3]) {
    await logger.getByLabel(`Set ${number} weight`, { exact: true }).fill('62.5');
    await logger.getByLabel(`Set ${number} reps`, { exact: true }).fill('8');
    await logger.getByLabel(`Set ${number} RIR`, { exact: true }).fill('2');
    await logger.getByRole('button', { name: 'Complete set', exact: true }).click();
    await expect(
      logger.getByRole('button', { name: 'Completed', exact: true, includeHidden: true }),
    ).toHaveCount(number);
  }
  await expect(logger.getByRole('button', { name: 'Complete set', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next Exercise' }).click();
  await expect(page.getByRole('heading', { name: 'Logger Row', exact: true })).toBeVisible();
  await logger.getByLabel('Set 1 weight', { exact: true }).fill('40');
  await logger.getByLabel('Set 1 reps', { exact: true }).fill('10');
  await logger.getByRole('button', { name: 'Complete set', exact: true }).click();
  await expect(
    logger.getByRole('button', { name: 'Completed', exact: true, includeHidden: true }),
  ).toHaveCount(1);
  await finishLogger(page);
  await expect(page.getByRole('link', { name: 'View Completed Workout' })).toBeVisible();
  await page.getByRole('link', { name: 'View Completed Workout' }).click();
  await expect(page.getByRole('region', { name: 'Exercise summaries' })).toContainText(
    '3 of 3 sets completed',
  );
  await expect(page.locator('.workout-summary-metrics')).toContainText('Sets completed4');
  for (const width of [375, 390, 393, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: testInfo.outputPath('summary-' + width + '.png'),
      fullPage: true,
    });
  }
  await page.getByRole('link', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start Workout', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Push Day/ }).click();
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
  await expect(logger.getByLabel('Set 1 weight', { exact: true })).toHaveValue('65');
  await expect(logger.getByLabel('Set 2 weight', { exact: true })).toHaveValue('62.5');
  await expect(
    logger.getByRole('button', { name: 'Completed', exact: true, includeHidden: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Last workout', exact: true })).toBeVisible();
  await logger.getByRole('button', { name: 'Complete set', exact: true }).click();
  await expect(
    logger.getByRole('button', { name: 'Completed', exact: true, includeHidden: true }),
  ).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Add 30 Seconds' })).toBeEnabled();
  for (const width of [375, 390, 393, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const action = await logger
      .getByRole('button', { name: 'Complete set', exact: true })
      .boundingBox();
    expect(action!.height).toBeGreaterThanOrEqual(54);
    expect(action!.y + action!.height).toBeLessThanOrEqual(844);
    for (const control of await page
      .locator('.workout-adjustment button, .workout-rest-button')
      .all()) {
      const box = await control.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: testInfo.outputPath('active-' + width + '.png') });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('active-logger.png'), fullPage: true });
  const sessionUrl = page.url();
  await page.getByRole('link', { name: 'Leave workout, keep session saved' }).click();
  await page.getByRole('link', { name: 'Workout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Start training' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Start/ })).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('workout-landing-active.png'),
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Resume Workout', exact: true }).click();
  await expect(page).toHaveURL(sessionUrl);
  await expect(
    logger.getByRole('button', { name: 'Completed', exact: true, includeHidden: true }),
  ).toHaveCount(1);
  await finishLogger(page);
  await page.goto('/progress');
  await expectProgressCounts(page, 2, 5);
});
