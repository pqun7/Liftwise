import { openWorkoutMenu, openWorkoutOverview } from './workoutUi';
import { openLegacyUnplannedFixture } from './workoutUi';
import { finishLogger } from './workoutUi';
import { expect, test, type Page } from '@playwright/test';

async function addExercise(page: Page, name: string) {
  await openWorkoutMenu(page);
  await page.getByRole('link', { name: 'Add Exercise', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill(name);
  await page.getByRole('searchbox', { name: 'Search exercises' }).press('Tab');
  await page
    .getByRole('button', { name: new RegExp(name) })
    .first()
    .click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}

test('gym-speed Quick Workout survives undo, skip, replacement, and reload on iPhone', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'webkit', 'One focused iPhone WebKit workflow.');
  test.setTimeout(120_000);
  for (const name of ['Speed Bench', 'Speed Row', 'Speed Raise']) {
    await page.goto('/exercises/new');
    await page.getByLabel('Name', { exact: true }).fill(name);
    await page.getByLabel('Primary muscle').fill('Chest');
    await page.getByLabel('Primary muscle').press('Enter');
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await page.goto('/workout');
  const dismiss = page.getByRole('button', { name: 'Dismiss' });
  if (await dismiss.isVisible()) await dismiss.click();
  await openLegacyUnplannedFixture(page);
  await addExercise(page, 'Speed Bench');
  await page.getByLabel('Set 1 weight', { exact: true }).fill('100');
  await page.getByLabel('Set 1 reps', { exact: true }).fill('8');
  await page.getByLabel('Set 1 RIR', { exact: true }).fill('2');
  await page.getByLabel('Set 1 RIR', { exact: true }).press('Tab');
  await page.getByRole('button', { name: 'Complete set', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout complete', exact: true })).toBeVisible();
  await finishLogger(page);
  await expect(page.getByRole('heading', { name: 'Start training' })).toBeVisible();
  await openLegacyUnplannedFixture(page);
  await addExercise(page, 'Speed Bench');
  await addExercise(page, 'Speed Row');
  await page.getByRole('button', { name: /^Speed Bench, upcoming/ }).click();
  const bench = page.getByRole('region', { name: 'Set logger' });
  await expect(page.getByRole('link', { name: 'Last workout' })).toContainText('100');
  await expect(bench.getByLabel('Set 1 weight', { exact: true })).toHaveValue('100');
  await bench.getByRole('button', { name: 'Set 1 weight plus 2.5' }).click();
  await expect(bench.getByLabel('Set 1 weight', { exact: true })).toHaveValue('102.5');
  await expect(bench.getByRole('button', { name: 'Copy Previous Set' })).toBeVisible();
  await bench.getByRole('button', { name: 'Complete set', exact: true }).click();
  await page.getByRole('button', { name: 'Undo completion' }).click();
  await expect(bench.getByRole('button', { name: 'Complete set', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await bench.getByRole('button', { name: 'Complete set', exact: true }).click();
  await openWorkoutOverview(page);
  const overview = page.getByRole('region', { name: 'Workout Overview', exact: true });
  const overviewBench = overview.getByRole('article', { name: 'Speed Bench' });
  await overviewBench.getByRole('button', { name: 'Collapse completed exercise' }).click();
  await expect(overviewBench.getByLabel('Set 1 weight', { exact: true })).toBeHidden();
  await overviewBench.getByRole('button', { name: 'Expand exercise' }).click();
  await openWorkoutMenu(page);
  await page.getByRole('button', { name: 'Close overview', exact: true }).click();
  await openWorkoutOverview(page);
  const row = overview.getByRole('article', { name: 'Speed Row' });
  await row.getByRole('button', { name: 'Skip exercise', exact: true }).click();
  await expect(row).toContainText('Skipped');
  await openWorkoutMenu(page);
  await page.getByRole('button', { name: 'Close overview', exact: true }).click();
  await addExercise(page, 'Speed Raise');
  await openWorkoutOverview(page);
  await overview
    .getByRole('article', { name: 'Speed Raise' })
    .getByRole('link', { name: 'Replace Exercise for This Workout' })
    .click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Barbell Bench Press');
  await page
    .getByRole('button', { name: /Barbell Bench Press/ })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Barbell Bench Press', exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await openWorkoutOverview(page);
  await expect(overviewBench.getByLabel('Set 1 weight', { exact: true })).toHaveValue('102.5');
  await expect(overviewBench.getByLabel('Set 1 reps', { exact: true })).toHaveValue('8');
  await expect(overviewBench.getByLabel('Set 1 RIR', { exact: true })).toHaveValue('2');
  await expect(
    overviewBench.getByRole('button', { name: 'Completed', exact: true, includeHidden: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(row).toContainText('Skipped');
  await expect(overview.getByRole('article')).toHaveCount(3);
  await expect(
    page.getByRole('heading', { name: 'Barbell Bench Press', exact: true }),
  ).toBeVisible();
});
