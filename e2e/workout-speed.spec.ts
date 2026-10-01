import { expect, test, type Page } from '@playwright/test';

async function addExercise(page: Page, name: string) {
  await page.getByRole('link', { name: 'Add Exercise', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill(name);
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
  await page.getByRole('button', { name: /Start Quick Workout/ }).click();
  await addExercise(page, 'Speed Bench');
  await page.getByLabel('Set 1 weight', { exact: true }).fill('100');
  await page.getByLabel('Set 1 reps', { exact: true }).fill('8');
  await page.getByLabel('Set 1 RIR').fill('2');
  await page.getByLabel('Set 1 RIR').press('Tab');
  await page.getByRole('button', { name: 'Complete set', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Completed', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Finish Workout' }).click();
  await expect(page.getByRole('heading', { name: 'Start training' })).toBeVisible();
  await page.getByRole('button', { name: /Start Quick Workout/ }).click();
  await addExercise(page, 'Speed Bench');
  const bench = page.getByRole('article', { name: 'Speed Bench' });
  await expect(bench.getByRole('region', { name: 'Previous performance' })).toContainText('100');
  await bench.getByRole('button', { name: 'Copy Previous Set' }).click();
  await expect(bench.getByLabel('Set 1 weight', { exact: true })).toHaveValue('100');
  await bench.getByRole('button', { name: 'Set 1 weight plus 2.5 kg' }).click();
  await expect(bench.getByLabel('Set 1 weight', { exact: true })).toHaveValue('102.5');
  await bench.getByRole('button', { name: 'Complete set', exact: true }).click();
  await page.getByRole('button', { name: 'Undo completion' }).click();
  await expect(bench.getByRole('button', { name: 'Complete set', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await bench.getByRole('button', { name: 'Complete set', exact: true }).click();
  await bench.getByRole('button', { name: 'Collapse completed exercise' }).click();
  await expect(bench.getByLabel('Set 1 weight', { exact: true })).toBeHidden();
  await bench.getByRole('button', { name: 'Expand exercise' }).click();
  await addExercise(page, 'Speed Row');
  const row = page.getByRole('article', { name: 'Speed Row' });
  await row.getByRole('button', { name: 'Skip exercise', exact: true }).click();
  await expect(row).toContainText('Skipped');
  await addExercise(page, 'Speed Raise');
  await page
    .getByRole('article', { name: 'Speed Raise' })
    .getByRole('link', { name: 'Replace Exercise for This Workout' })
    .click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Barbell Bench Press');
  await page
    .getByRole('button', { name: /Barbell Bench Press/ })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Barbell Bench Press', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(bench.getByLabel('Set 1 weight', { exact: true })).toHaveValue('102.5');
  await expect(bench.getByLabel('Set 1 reps', { exact: true })).toHaveValue('8');
  await expect(bench.getByLabel('Set 1 RIR')).toHaveValue('2');
  await expect(bench.getByRole('button', { name: 'Completed', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(row).toContainText('Skipped');
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(
    page.getByRole('heading', { name: 'Barbell Bench Press', exact: true }),
  ).toBeVisible();
});
