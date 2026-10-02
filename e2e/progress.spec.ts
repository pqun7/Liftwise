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
    await page.getByRole('link', { name: 'Add Exercise', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Progress Bench');
    await page.getByRole('button', { name: /Progress Bench/ }).click();
    await page.getByLabel('Set 1 weight', { exact: true }).fill('100');
    await page.getByLabel('Set 1 reps', { exact: true }).fill(reps);
    await page.getByLabel('Set 1 RIR', { exact: true }).fill('2');
    await page.getByLabel('Set 1 RIR', { exact: true }).press('Tab');
    await page.getByRole('button', { name: 'Complete set', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Completed', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await finishLogger(page);
    await expect(page.getByRole('heading', { name: 'Start training' })).toBeVisible();
  }
  await page.goto('/progress');
  await expect(page.getByRole('region', { name: 'Workout history' }).getByRole('link')).toHaveCount(
    2,
  );
  await page.getByLabel('Weight (kg)', { exact: true }).fill('80');
  expect(
    await page
      .getByLabel('Weight (kg)', { exact: true })
      .evaluate((input) => Number.parseFloat(getComputedStyle(input).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await page.getByLabel('Waist (cm)', { exact: true }).fill('85');
  await page.getByLabel('Waist (cm)', { exact: true }).press('Enter');
  await expect(page.getByRole('region', { name: 'Body measurements' })).toContainText(
    'Waist (cm): 85',
  );
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export sets.csv' }).focus();
  await page.keyboard.press('Enter');
  expect((await downloading).suggestedFilename()).toBe('sets.csv');
  await page.getByRole('link', { name: 'Progress Bench', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Progress Bench', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Estimated 1RM (kg)', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('10 reps at 100 kg', { exact: false })).toBeVisible();
  await page.getByText('Chart values and session links', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'Estimated 1RM (kg)' })).toContainText('133.3');
  await page.getByLabel('Chart metric').selectOption('volume');
  expect(
    await page
      .getByLabel('Chart metric')
      .evaluate((input) => Number.parseFloat(getComputedStyle(input).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await expect(page.getByRole('region', { name: 'Volume (kg·reps)' })).toContainText('1000');
  await page.getByRole('radio', { name: 'ALL', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'ALL', exact: true })).toBeChecked();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Progress Bench', exact: true })).toBeVisible();
  await setOffline(context, browserName, true);
  if (browserName === 'webkit') {
    // Existing Windows WebKit limitation: offline document navigation is unsupported.
    await page.getByRole('link', { name: '← Progress' }).click();
    await page.getByRole('link', { name: 'Progress Bench', exact: true }).click();
  } else {
    await page.reload();
  }
  await expect(page.getByRole('heading', { name: 'Progress Bench', exact: true })).toBeVisible();
  await expect(page.getByText('10 reps at 100 kg', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: '← Progress' }).click();
  await expect(page.getByRole('region', { name: 'Body measurements' })).toContainText(
    'Waist (cm): 85',
  );
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => document.documentElement.clientWidth),
    );
  }
});
