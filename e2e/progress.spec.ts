import { openWorkoutMenu } from './workoutUi';
import { openLegacyUnplannedFixture } from './workoutUi';
import { finishLogger } from './workoutUi';
import { expect, test } from '@playwright/test';
import { setOffline } from './offline';

test('completed history, PRs, charts, measurements and CSV stay usable offline', async ({
  page,
  context,
  browserName,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/exercises/new');
  await page.getByLabel('Name', { exact: true }).fill('Progress Bench');
  await page.getByLabel('Primary muscle').fill('Chest');
  await page.getByLabel('Primary muscle').press('Enter');
  await expect(page.getByRole('heading', { name: 'Progress Bench', exact: true })).toBeVisible();
  for (const reps of ['8', '10']) {
    await page.goto('/workout');
    const dismiss = page.getByRole('button', { name: 'Dismiss' });
    if (await dismiss.isVisible()) await dismiss.click();
    await openLegacyUnplannedFixture(page);
    await openWorkoutMenu(page);
    await page.getByRole('link', { name: 'Add Exercise', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Progress Bench');
    await page.getByRole('button', { name: /Progress Bench/ }).click();
    await page.getByLabel('Set 1 weight', { exact: true }).fill('100');
    await page.getByLabel('Set 1 reps', { exact: true }).fill(reps);
    await page.getByLabel('Set 1 RIR', { exact: true }).fill('2');
    await page.getByLabel('Set 1 RIR', { exact: true }).press('Tab');
    await page.getByRole('button', { name: 'Complete set', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Workout complete', exact: true }),
    ).toBeVisible();
    await finishLogger(page);
    await expect(page.getByRole('heading', { name: 'Start training' })).toBeVisible();
  }
  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: '7D', exact: true }).click();
  await expect(page.getByRole('radio', { name: '7D', exact: true })).toBeChecked();
  await page.getByRole('link', { name: /Workout History View/ }).click();
  await expect(page.getByRole('heading', { name: 'Workout History', exact: true })).toBeVisible();
  await expect(page.locator('main ul').getByRole('link')).toHaveCount(2);
  await page.getByRole('button', { name: 'Legacy unplanned workout', exact: true }).click();
  await expect(page.locator('main ul').getByRole('link')).toHaveCount(2);
  await page.getByLabel('Sort workouts').selectOption('oldest');
  await page.locator('main ul').getByRole('link').first().click();
  await expect(page.getByText('Workout complete', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Done', exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Progress', exact: true }).click();
  await page.getByRole('link', { name: /Body Measurements Track/ }).click();
  await page.getByLabel('Weight (kg)', { exact: true }).fill('80');
  expect(
    await page
      .getByLabel('Weight (kg)', { exact: true })
      .evaluate((input) => Number.parseFloat(getComputedStyle(input).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await page.getByLabel('Waist (cm)', { exact: true }).fill('85');
  await page.getByRole('button', { name: 'Add Measurement', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Measurement saved on this device.');
  await page.getByText('Saved measurements (1)', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'Body measurements' })).toContainText(
    'Waist (cm): 85',
  );
  await page.getByLabel('Date', { exact: true }).fill('2026-01-01');
  await page.getByLabel('Weight (kg)', { exact: true }).fill('81');
  await page.getByRole('button', { name: 'Add Measurement', exact: true }).click();
  await page.getByRole('button', { name: 'Next measurement', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Previous measurement', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Previous measurement', exact: true }).click();
  await page.getByRole('button', { name: 'Edit measurement', exact: true }).last().click();
  await page.getByLabel('Waist (cm)', { exact: true }).fill('84');
  await page.getByRole('button', { name: 'Save Measurement', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Body measurements' })).toContainText(
    'Waist (cm): 84',
  );
  await page.getByRole('link', { name: 'Back to Progress' }).click();
  await page.getByRole('link', { name: /Workout History View/ }).click();
  await page.getByText('Export user data', { exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export sets.csv' }).click();
  expect((await downloading).suggestedFilename()).toBe('sets.csv');
  await page.getByRole('link', { name: 'Back to Progress' }).click();
  await page.getByRole('link', { name: /Exercise Insights Analyze/ }).click();
  await page.getByRole('link', { name: 'Progress Bench', exact: true }).click();
  await expect(page.getByLabel('Exercise', { exact: true })).toContainText('Progress Bench');
  await page.getByLabel('Chart metric').selectOption('e1rm');
  await page.getByText('Chart values and session links', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'Estimated 1RM (kg)' })).toContainText('133.3');
  await page.getByText('Personal records', { exact: true }).click();
  await expect(page.getByText('10 reps at 100 kg', { exact: false })).toBeVisible();
  await page.getByLabel('Chart metric').selectOption('volume');
  expect(
    await page
      .getByLabel('Chart metric')
      .evaluate((input) => Number.parseFloat(getComputedStyle(input).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await expect(page.getByRole('region', { name: 'Volume (kg·reps)' })).toContainText('1,000');
  await page.getByRole('radio', { name: 'ALL', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'ALL', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: '1M', exact: true }).click();
  await page.getByLabel('Exercise', { exact: true }).selectOption({ label: 'Progress Bench' });
  await page.locator('.recharts-surface').click({ position: { x: 140, y: 80 } });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByLabel('Exercise', { exact: true })).toContainText('Progress Bench');
  await setOffline(context, browserName, true);
  if (browserName !== 'webkit') await page.reload();
  await expect(page.getByLabel('Exercise', { exact: true })).toContainText('Progress Bench');
  await page.getByRole('link', { name: 'Back to Progress' }).click();
  await page.getByRole('link', { name: /Body Measurements Track/ }).click();
  await page.getByText('Saved measurements (2)', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'Body measurements' })).toContainText(
    'Waist (cm): 84',
  );
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => document.documentElement.clientWidth),
    );
  }
});
