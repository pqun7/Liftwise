import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function stage(page: Page, label: string, testInfo?: TestInfo) {
  await expect(page.locator('.builder-stepper li')).toHaveCount(5);
  await expect(page.locator('.builder-stepper .is-current')).toHaveText(label);
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(1);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (testInfo)
      await page.screenshot({
        path: testInfo.outputPath(`${label.toLowerCase()}-${width}.png`),
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}
async function basics(page: Page, name: string, cycle = false) {
  await page.goto('/plan/new');
  await page.getByLabel('Program name').fill(name);
  if (cycle) await page.getByRole('radio', { name: /Flexible Cycle/ }).check();
  await page.getByRole('button', { name: 'Continue to Template' }).click();
  await expect(page.locator('.builder-stepper .is-current')).toHaveText('Template');
}
async function template(page: Page, choice = 'Custom') {
  await page.getByRole('button', { name: new RegExp(`^${choice}`) }).click();
  await page.getByRole('button', { name: 'Next: Schedule' }).click();
  await expect(page.locator('.builder-stepper .is-current')).toHaveText('Schedule');
}
async function review(page: Page) {
  for (let day = 0; day < 30; day++) {
    const action = page.locator('.builder-footer a').last();
    await expect(action).toBeVisible();
    if ((await action.innerText()).includes('Review Program')) break;
    const destination = await action.getAttribute('href');
    await action.click();
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await expect(page.locator('.builder-footer a').last()).not.toHaveAttribute(
      'href',
      destination!,
    );
  }
  await page.getByRole('link', { name: 'Review Program', exact: true }).click();
}
async function add(page: Page, name: string) {
  await page.getByRole('link', { name: 'Add exercise', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill(name);
  await page.getByRole('button', { name: `Add ${name} to`, exact: false }).click();
  await expect(page.locator('.builder-exercises')).toContainText(name);
}

test('first Custom program: five stages, no seeded exercises, notes, targets, reorder, Review corrections and durable editing', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/plan');
  await expect(page.getByRole('radio', { name: 'Details', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Build your training week' })).toBeVisible();
  const art = page.locator('.plan-empty-artwork');
  await expect(art).toBeVisible();
  expect(await art.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('plan-empty.png'), fullPage: true });
  await page.getByRole('link', { name: 'Create program', exact: true }).click();
  await stage(page, 'Basics', testInfo);
  await page.getByRole('button', { name: 'Continue to Template' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter a program name');
  await page.getByLabel('Program name').fill('Custom Strength');
  await page.getByRole('button', { name: 'Add description' }).click();
  await page.getByLabel('Description or notes').fill('My chosen exercises');
  await page.getByRole('button', { name: 'Continue to Template' }).click();
  await stage(page, 'Template', testInfo);
  await template(page);
  await stage(page, 'Schedule', testInfo);
  await expect(page.locator('.structure-day')).toHaveCount(3);
  await expect(page.locator('.schedule-page')).not.toContainText('Add exercise');
  await page.getByRole('button', { name: 'Tuesday', exact: true }).click();
  await expect(page.locator('.schedule-summary')).toContainText('4 training days selected');
  await page.getByRole('button', { name: 'Tuesday', exact: true }).click();
  await page.getByRole('button', { name: 'Rename Workout Day 1', exact: true }).click();
  await page.getByRole('textbox', { name: 'Workout name' }).fill('My Push');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await stage(page, 'Exercises', testInfo);
  await expect(page.getByText('0 exercises', { exact: true })).toBeVisible();
  await expect(page.locator('.builder-exercise')).toHaveCount(0);
  await page.getByRole('link', { name: 'Schedule', exact: true }).click();
  await expect(page.locator('.structure-day')).toContainText([
    'My Push',
    'Workout Day 2',
    'Workout Day 3',
  ]);
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await add(page, 'Barbell Bench Press');
  await page.locator('.builder-exercise-main').filter({ hasText: 'Barbell Bench Press' }).click();
  await page.getByLabel('Target sets').fill('4');
  await page.getByLabel('Minimum reps').fill('-1');
  await page.getByRole('button', { name: 'Save prescription' }).click();
  await expect(page.getByRole('alert')).toContainText('zero or a positive');
  await page.getByLabel('Minimum reps').fill('8');
  await page.getByLabel('Maximum reps').fill('12');
  await page.getByLabel('Rest duration in seconds').fill('90');
  await page.getByRole('button', { name: 'Save prescription' }).click();
  await expect(page.locator('.builder-exercises')).toContainText('4 sets · 8–12 reps');
  await add(page, 'Dumbbell Shoulder Press');
  await page.getByRole('button', { name: 'Reorder Dumbbell Shoulder Press' }).click();
  await page.getByRole('button', { name: 'Move Dumbbell Shoulder Press up' }).click();
  await expect(page.locator('.builder-exercise').first()).toContainText('Dumbbell Shoulder Press');
  await page.getByText('Add day note', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Day note' }).fill('Keep the last rep controlled');
  await page.getByRole('link', { name: 'Next day', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep Editing' }).click();
  await expect(page.getByRole('textbox', { name: 'Day note' })).toHaveValue(
    'Keep the last rep controlled',
  );
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.locator('.day-note [role="status"]')).toHaveText('Note saved');
  await page.getByRole('link', { name: 'Next day', exact: true }).click();
  await page.getByText('Add day note', { exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Day note' })).toHaveValue('');
  await page.getByRole('link', { name: 'Previous day', exact: true }).click();
  await page.getByText('Edit day note', { exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Day note' })).toHaveValue(
    'Keep the last rep controlled',
  );
  await review(page);
  await stage(page, 'Review', testInfo);
  await expect(page.locator('.review-overview')).toContainText('2 exercises');
  await page.getByRole('radio', { name: /Save as another program/ }).check();
  await page.getByRole('link', { name: 'Edit program details', exact: true }).click();
  await page.getByLabel('Program name').fill('Updated Custom Strength');
  await page.getByRole('button', { name: 'Save & return to Review' }).click();
  await expect(page.getByRole('radio', { name: /Save as another program/ })).toBeChecked();
  await expect(page.locator('.review-details')).toContainText('Updated Custom Strength');
  await page.getByRole('link', { name: 'Edit schedule', exact: true }).click();
  await page.getByRole('button', { name: 'Rename My Push', exact: true }).click();
  await page.getByRole('textbox', { name: 'Workout name' }).fill('Push Alpha');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Return to Review' }).click();
  await expect(page.locator('.review-overview')).toContainText('Push Alpha');
  await page.getByRole('radio', { name: /Create and set as active/ }).check();
  await page.getByRole('button', { name: 'Create & Activate Program' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await page.getByRole('radio', { name: 'Details', exact: true }).click();
  await expect(page.locator('.plan-active-card')).toContainText('Updated Custom Strength');
  await page.screenshot({ path: testInfo.outputPath('plan-saved.png'), fullPage: true });
  await page.reload();
  await page.getByRole('link', { name: 'Edit program', exact: true }).click();
  await page.getByRole('button', { name: 'Continue to Template' }).click();
  await page.getByRole('button', { name: /^Full Body/ }).click();
  await page.getByRole('button', { name: 'Next: Schedule' }).click();
  await expect(page.locator('.structure-day').first()).toContainText('Push Alpha');
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await expect(page.locator('.builder-exercise')).toHaveCount(2);
  await review(page);
  await page.getByRole('button', { name: 'Save Program' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await page.reload();
  await page.getByRole('radio', { name: 'Details', exact: true }).click();
  await expect(page.locator('.plan-active-card')).toContainText('2 exercises');
  expect(errors).toEqual([]);
});

test('template A → B → Custom replaces untouched starters only', async ({ page }) => {
  test.setTimeout(90_000);
  await basics(page, 'Template Navigation');
  await template(page, 'Full Body');
  await expect(page.locator('.structure-day')).toHaveCount(3);
  await page.getByRole('link', { name: 'Change', exact: true }).click();
  await template(page, 'Upper / Lower');
  await expect(page.locator('.structure-day')).toHaveCount(4);
  await page.getByRole('link', { name: 'Change', exact: true }).click();
  await template(page);
  await expect(page.locator('.structure-day')).toHaveCount(3);
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await expect(page.locator('.builder-exercise')).toHaveCount(0);
});

test('flexible cycle: add, rename, duplicate, move, delete, recovery artwork and active selection survive reload', async ({
  page,
}, testInfo) => {
  test.setTimeout(150_000);
  page.on('dialog', (dialog) => void dialog.accept());
  await basics(page, 'Flexible Strength', true);
  await template(page);
  await page.getByRole('button', { name: 'Add Recovery Day' }).click();
  await page.getByRole('button', { name: 'Add Workout Day' }).click();
  await page.getByRole('button', { name: 'Rename Workout Day 4', exact: true }).click();
  await page.getByRole('textbox', { name: 'Workout name' }).fill('Upper');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const rest = page.getByRole('article', { name: 'Recovery schedule day', exact: true });
  await rest.getByRole('button', { name: 'Options for Recovery' }).click();
  await rest.getByRole('button', { name: 'Move up' }).click();
  await expect(page.locator('.structure-day').nth(2)).toContainText('Recovery');
  await rest.getByRole('button', { name: 'Move down' }).click();
  await expect(page.locator('.structure-day').nth(3)).toContainText('Recovery');
  const upper = page.getByRole('article', { name: 'Upper schedule day', exact: true });
  await upper.getByRole('button', { name: 'Options for Upper' }).click();
  await upper.getByRole('button', { name: 'Duplicate day' }).click();
  const copy = page.getByRole('article', { name: 'Upper Copy schedule day', exact: true });
  await copy.getByRole('button', { name: 'Options for Upper Copy' }).click();
  await copy.getByRole('button', { name: 'Delete day' }).click();
  await expect(page.locator('.structure-day')).toHaveCount(5);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Add Workout Day' }).click();
  await expect(page.locator('.structure-day')).toHaveCount(8);
  await stage(page, 'Schedule', testInfo);
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await expect(page.locator('.exercise-day-navigation')).toContainText('Day 1 of 8');
  for (let i = 0; i < 3; i++) {
    const next = page.getByRole('link', { name: 'Next day', exact: true });
    const destination = await next.getAttribute('href');
    await next.click();
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await expect(page.locator('.exercise-day-navigation')).toContainText(`Day ${i + 2} of 8`);
  }
  await expect(page.getByRole('heading', { name: 'Take the day off' })).toBeVisible();
  await expect(page.locator('.recovery-artwork')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add exercise', exact: true })).toHaveCount(0);
  await expect(page.locator('.recovery-up-next')).toContainText('Upper');
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
  await page.setViewportSize({ width: 375, height: 844 });
  await page.addStyleTag({ content: ':root { --safe-top: 47px; --safe-bottom: 34px; }' });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollHeight))
    .toBeLessThanOrEqual(844);
  await stage(page, 'Exercises', testInfo);
  await page.screenshot({ path: testInfo.outputPath('recovery.png'), fullPage: true });
  await page.getByRole('link', { name: 'View Day 5' }).click();
  await expect(page.getByRole('heading', { name: 'Upper', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Previous day', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Take the day off' })).toBeVisible();
  await review(page);
  await expect(page.locator('.review-details')).toContainText('8 days');
  await expect(page.locator('.review-overview .review-day')).toHaveCount(8);
  await page.getByRole('button', { name: 'Create & Activate Program' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await page.reload();
  await page.getByRole('radio', { name: 'Details', exact: true }).click();
  await expect(page.locator('.plan-active-card')).toContainText('Flexible Strength');
  await basics(page, 'Another Plan');
  await template(page);
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await review(page);
  await page.getByRole('radio', { name: /Save as another program/ }).check();
  await page.getByRole('button', { name: 'Create Program', exact: true }).click();
  await page.getByRole('radio', { name: 'Details', exact: true }).click();
  await expect(page.locator('.plan-active-card')).toContainText('Flexible Strength');
  await page.getByRole('button', { name: 'Set as active', exact: true }).click();
  await page.getByRole('radio', { name: 'Details', exact: true }).click();
  await expect(page.locator('.plan-active-card')).toContainText('Another Plan');
  await page.reload();
  await page.getByRole('radio', { name: 'Details', exact: true }).click();
  await expect(page.locator('.plan-active-card')).toContainText('Another Plan');
  await page.screenshot({ path: testInfo.outputPath('plan-multiple.png'), fullPage: true });
});
