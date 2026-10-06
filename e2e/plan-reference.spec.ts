import { expect, test } from '@playwright/test';

test('Custom has five separate steps and keeps only manually added exercises after saved editing', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/plan/new');
  await page.getByLabel('Program name').fill('Manual Custom QA');
  await page.getByRole('button', { name: 'Continue to Program' }).click();
  await expect(page.getByRole('heading', { name: 'Choose a starting template' })).toBeVisible({
    timeout: 15_000,
  });
  const steps = page.getByRole('navigation', { name: 'Program builder steps' });
  await expect(steps.locator('li')).toHaveText([
    'Basics',
    'Program',
    'Schedule',
    'Exercises',
    'Review',
  ]);
  await expect(steps.locator('[aria-current="step"]')).toHaveText('Program');
  await page.getByRole('button', { name: 'Custom Build your own routine' }).click();
  await page.getByRole('button', { name: 'Use Custom Template' }).click();
  await expect(steps.locator('[aria-current="step"]')).toHaveText('Schedule');
  await expect(page.locator('.cycle-row')).toHaveCount(4);
  await expect(page.locator('.cycle-row').getByText('0 exercises', { exact: true })).toHaveCount(4);
  await page.getByRole('button', { name: 'Monday', exact: true }).click();
  await steps.getByRole('link', { name: 'Program', exact: true }).click();
  await expect(steps.locator('[aria-current="step"]')).toHaveText('Program');
  await page.getByRole('button', { name: 'Use Custom Template' }).click();
  await expect(page.getByRole('button', { name: 'Monday', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await expect(steps.locator('[aria-current="step"]')).toHaveText('Exercises');
  await expect(page.locator('.builder-exercise')).toHaveCount(0);
  await page.getByRole('link', { name: 'Add exercise', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Barbell Bench Press');
  await page
    .getByRole('link', { name: 'Configure Barbell Bench Press before adding', exact: true })
    .click();
  await page.getByLabel('Target sets', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Add to day', exact: true }).click();
  await expect(page.locator('.builder-exercise')).toHaveCount(1);
  await expect(page.locator('.builder-exercise')).toContainText('4 ×');
  await steps.getByRole('link', { name: 'Schedule', exact: true }).click();
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await expect(page.locator('.builder-exercise')).toHaveCount(1);
  await page.getByRole('link', { name: 'Next: Day 2' }).click();
  await page.getByRole('link', { name: 'Next: Day 3' }).click();
  await page.getByRole('link', { name: 'Next: Review', exact: true }).click();
  await expect(steps.locator('[aria-current="step"]')).toHaveText('Review');
  await page.getByRole('button', { name: 'Create & Start Program' }).click();
  await expect(page.locator('.plan-active-card')).toContainText('Manual Custom QA');
  await page.reload();
  await page.getByRole('button', { name: 'Program settings', exact: true }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Edit program', exact: true }).click();
  await expect(page.getByLabel('Program name')).toHaveValue('Manual Custom QA');
  await expect(steps.locator('[aria-current="step"]')).toHaveText('Basics');
  await page.getByRole('button', { name: 'Continue to Program' }).click();
  await page.getByRole('button', { name: 'Use Custom Template' }).click();
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await expect(page.locator('.builder-exercise')).toHaveCount(1);
  await expect(page.locator('.builder-exercise')).toContainText('Barbell Bench Press');
});

async function noOverflow(page: import('@playwright/test').Page) {
  for (const width of [320, 375, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

test('weekly reference flow retains prescriptions, notes, assignments and activation after reload', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/plan');
  await expect(page.getByRole('heading', { name: 'Build your training week' })).toBeVisible();
  await page.screenshot({ path: 'test-results/plan-reference-empty.png', fullPage: true });
  await page.getByRole('link', { name: 'Create program', exact: true }).click();
  await page.getByLabel('Program name').fill('First Program');
  await page.getByRole('button', { name: 'Add description' }).click();
  await page.getByLabel('Description or notes').fill('Preserve this description');
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/plan-reference-basics.png', fullPage: true });
  await page.getByRole('button', { name: 'Continue to Program' }).click();
  await page.getByRole('button', { name: /Full Body/ }).click();
  await page.screenshot({ path: 'test-results/plan-reference-templates.png', fullPage: true });
  await page.getByRole('button', { name: 'Use Full Body' }).click();
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/plan-reference-weekly.png', fullPage: true });
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await expect(page.getByText('Day 1 of 3', { exact: true })).toBeVisible();
  await expect(page.locator('.builder-exercise')).toHaveCount(5);
  await page.screenshot({ path: 'test-results/plan-reference-exercises.png', fullPage: true });
  await page.getByRole('link', { name: 'Add day note' }).click();
  await page.getByLabel('Day notes').fill('Keep these notes');
  await page.getByRole('button', { name: /Save/ }).click();
  await expect(page.getByRole('link', { name: 'Keep these notes' })).toBeVisible();
  await page.getByRole('link', { name: 'Next: Day 2' }).click();
  await page.getByRole('link', { name: 'Previous', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Keep these notes' })).toBeVisible();
  await page.getByRole('link', { name: 'Next: Day 2' }).click();
  await page.getByRole('link', { name: 'Next: Day 3' }).click();
  await page.getByRole('link', { name: 'Next: Review' }).click();
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/plan-reference-review.png', fullPage: true });
  await page.getByRole('button', { name: 'Create & Start Program' }).click();
  await expect(page.getByRole('heading', { name: 'First Program', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/plan-reference-existing.png', fullPage: true });
  await page.getByRole('link', { name: 'Edit program', exact: true }).click();
  await expect(page.getByLabel('Program name')).toHaveValue('First Program');
  await expect(page.getByLabel('Description or notes')).toHaveValue('Preserve this description');
  await page.getByLabel('Program name').fill('First Program Edited');
  await page.getByRole('button', { name: 'Continue to Program' }).click();
  await page.getByRole('button', { name: 'Use Full Body' }).click();
  await page.getByRole('button', { name: 'Monday', exact: true }).click();
  await page.getByRole('button', { name: 'Tuesday', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await expect(page.getByText('Day 1 of 3', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Day 1 of 3', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Next: Day 2' }).click();
  await expect(page.locator('.builder-exercise')).toHaveCount(6);
  await page.getByRole('link', { name: 'Next: Day 3' }).click();
  await page.getByRole('link', { name: 'Next: Review' }).click();
  await page.getByRole('button', { name: 'Save Program', exact: true }).click();
  await page.getByRole('link', { name: 'Create another program' }).click();
  await page.getByLabel('Program name').fill('Second Program');
  await page.getByRole('button', { name: 'Continue to Program' }).click();
  await page.getByRole('button', { name: /^Use / }).click();
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await expect(page.getByText('Day 1 of 4', { exact: true })).toBeVisible();
  const url = page.url().split('/days/')[0];
  await page.goto(`${url}/build/review`);
  await page.getByText('Save as another program', { exact: true }).click();
  await page.getByRole('button', { name: 'Create Program', exact: true }).click();
  const second = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Second Program', exact: true }) });
  await second.getByRole('button', { name: 'Set as active' }).click();
  await expect(
    page.locator('.plan-active-card').getByRole('heading', { name: 'Second Program' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator('.plan-active-card').getByRole('heading', { name: 'Second Program' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'First Program Edited' })).toBeVisible();
  await noOverflow(page);
});

test('flexible cycle supports real recovery entries, duplication, reorder, rename and persistence', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/plan/new');
  await page.getByLabel('Program name').fill('Flexible Cycle QA');
  await page.getByRole('radio', { name: /Flexible Cycle/ }).check();
  await page.getByRole('button', { name: 'Continue to Program' }).click();
  await page.getByRole('button', { name: /^Use / }).click();
  await page.getByRole('button', { name: 'Add Recovery Day', exact: true }).click();
  await expect(page.locator('.cycle-row')).toHaveCount(5);
  await page.getByRole('button', { name: 'Add Workout Day', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Add Workout Day', exact: true })
    .click();
  await expect(page.locator('.cycle-row')).toHaveCount(6);
  await page.getByRole('button', { name: 'Options for Upper A', exact: true }).click();
  await page.screenshot({ path: 'test-results/plan-reference-options.png', fullPage: true });
  await page.getByRole('button', { name: 'Rename workout', exact: true }).click();
  await page.getByLabel('Workout name').fill('Push A');
  await page.screenshot({ path: 'test-results/plan-reference-rename.png', fullPage: true });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Options for Push A' }).click();
  await page.getByRole('button', { name: 'Duplicate day', exact: true }).click();
  await expect(page.locator('.cycle-row')).toHaveCount(7);
  await page.getByRole('button', { name: 'Options for Push A Copy' }).click();
  await page.getByRole('button', { name: 'Move up', exact: true }).click();
  await expect(page.locator('.cycle-row').nth(5)).toContainText('Push A Copy');
  await page.getByRole('button', { name: 'Add Recovery Day', exact: true }).click();
  await expect(page.locator('.cycle-row')).toHaveCount(8);
  await page.getByRole('button', { name: 'Add Workout Day', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Add Workout Day', exact: true })
    .click();
  await expect(page.locator('.cycle-row')).toHaveCount(9);
  const lastOptions = page.locator('.cycle-row').last().getByRole('button');
  await lastOptions.click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete day', exact: true }).click();
  await expect(page.locator('.cycle-row')).toHaveCount(8);
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/plan-reference-cycle.png', fullPage: true });
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await expect(page.getByText('Day 1 of 8', { exact: true })).toBeVisible();
  await expect(page.locator('.builder-exercise')).toHaveCount(6);
  for (let day = 2; day <= 5; day++)
    await page.getByRole('link', { name: `Next: Day ${day}` }).click();
  await expect(page.getByRole('heading', { name: 'Recovery Day', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add exercise', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/plan-reference-recovery.png', fullPage: true });
  await page.getByRole('link', { name: 'Previous', exact: true }).click();
  await expect(page.locator('.builder-exercise')).toHaveCount(5);
  const base = page.url().split('/days/')[0];
  await page.goto(`${base}/build/review`);
  await expect(page.getByText('8 days', { exact: true })).toBeVisible();
  await expect(page.getByText('2 recovery days', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/plan-reference-cycle-review.png', fullPage: true });
  await page.getByRole('button', { name: 'Create & Start Program' }).click();
  await expect(page.locator('.plan-active-card')).toContainText('Flexible Cycle QA');
  await page.reload();
  await expect(page.locator('.plan-active-card')).toContainText('Flexible Cycle QA');
  await page.getByRole('link', { name: 'Edit program', exact: true }).click();
  await expect(page.getByRole('radio', { name: /Flexible Cycle/ })).toBeChecked();
  await page.getByRole('button', { name: 'Continue to Program' }).click();
  await page.getByRole('button', { name: /^Use / }).click();
  await expect(page.locator('.cycle-row')).toHaveCount(8);
  await expect(page.locator('.cycle-row').first()).toContainText('Push A');
});
