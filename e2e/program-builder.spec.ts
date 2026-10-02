import { expect, test } from '@playwright/test';
import { setOffline } from './offline';

test('program-first templates, inline targets, moves and custom exercise persist offline', async ({
  page,
  context,
  browserName,
}, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/exercises/new');
  await page.getByLabel('Name', { exact: true }).fill('Builder Custom Press');
  await page.getByLabel('Primary muscle').fill('chest');
  await page.getByRole('button', { name: 'Save custom exercise' }).click();
  await expect(page.getByRole('heading', { name: 'Builder Custom Press' })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.goto('/plan/new');
  await page.getByLabel('Program name').fill('Reference Upper Lower');
  await page.getByLabel('Description or notes').fill('Durable builder plan');
  await page.getByRole('button', { name: 'Next: Choose Days' }).click();
  await page.getByRole('button', { name: /Upper.*Lower/ }).click();
  await expect(page.getByRole('region', { name: /template preview/ })).toContainText(
    'Barbell Bench Press',
  );
  await page.getByRole('button', { name: 'Use This Template' }).click();
  await expect(page.getByRole('article', { name: /workout day/ })).toHaveCount(4);
  const upper = page.getByRole('article', { name: 'Upper A workout day' });
  await upper.getByRole('button', { name: /Barbell Bench Press/ }).click();
  await upper.getByLabel('Minimum reps').fill('6');
  await upper.getByLabel('Maximum reps').fill('8');
  await upper.getByLabel('Rest duration in seconds').fill('180');
  await upper.getByRole('button', { name: 'Done', exact: true }).click();
  await upper.getByRole('button', { name: 'Edit Barbell Bench Press targets' }).click();
  await upper
    .getByLabel('Move to Barbell Bench Press', { exact: true })
    .selectOption({ label: 'Upper B' });
  const other = page.getByRole('article', { name: 'Upper B workout day' });
  await other.getByRole('button', { name: 'Expand Upper B' }).click();
  await expect(other).toContainText('3 × 6–8');
  await upper.getByRole('button', { name: 'Expand Upper A' }).click();
  await upper.getByRole('link', { name: 'Add Exercise to Upper A' }).click();
  await expect(page.getByRole('heading', { name: 'Add to Upper A' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Builder Custom Press');
  await setOffline(context, browserName, true);
  await page.getByRole('button', { name: 'Add Builder Custom Press to Upper A' }).click();
  await expect(upper).toContainText('Builder Custom Press');
  await page.getByRole('button', { name: 'Save Program', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
  await expect(page.getByText('Changes are saved locally as you edit.')).toBeVisible();
  for (const width of [375, 390, 393, 402, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const field of await page.locator('input, textarea, select').all())
      expect(
        await field.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
      ).toBeGreaterThanOrEqual(16);
  }
  await page.screenshot({ path: testInfo.outputPath('program-first-editor.png'), fullPage: true });
  await setOffline(context, browserName, false);
  await page.reload();
  await other.getByRole('button', { name: 'Expand Upper B' }).click();
  await expect(other).toContainText('3 × 6–8');
  await upper.getByRole('button', { name: 'Expand Upper A' }).click();
  await expect(upper).toContainText('Builder Custom Press');
  await page.getByRole('link', { name: 'Workout', exact: true }).click();
  await expect(page.getByRole('button', { name: /Quick Workout/ })).toHaveCount(0);
  await page
    .getByRole('region', { name: 'Program context' })
    .getByRole('button', { name: /Upper B/ })
    .click();
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Leave workout, keep session saved' })).toBeVisible();
});

test('Custom weekdays rename, reschedule, fast-add and reorder without leaving the editor', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/plan/new');
  await page.getByLabel('Program name').fill('Custom Week');
  await page.getByRole('button', { name: 'Next: Choose Days' }).click();
  await page.getByRole('button', { name: 'Custom · Build your own schedule' }).click();
  await page.getByRole('button', { name: 'Next: Add Exercises' }).click();
  for (const [weekday, name] of [
    ['Monday', 'Push'],
    ['Wednesday', 'Pull'],
    ['Friday', 'Legs'],
  ]) {
    const day = page.getByRole('article', { name: weekday + ' workout day' });
    const expand = day.getByRole('button', { name: 'Expand ' + weekday });
    if (await expand.count()) await expand.click();
    await day.getByRole('button', { name: 'Options for ' + weekday }).click();
    await day.getByRole('button', { name: 'Rename day', exact: true }).click();
    await day.getByLabel('Workout day name').fill(name!);
    await day.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByRole('article', { name: name + ' workout day' })).toBeVisible();
  }
  const push = page.getByRole('article', { name: 'Push workout day' });
  await push.getByRole('button', { name: 'Expand Push' }).click();
  await push.getByLabel('Weekday for Push').selectOption('1');
  for (const query of ['Barbell Bench Press', 'Dumbbell Shoulder Press']) {
    await push.getByRole('link', { name: 'Add Exercise to Push' }).click();
    await page.getByRole('searchbox', { name: 'Search exercises' }).fill(query);
    await page.getByRole('button', { name: 'Add ' + query + ' to Push', exact: true }).click();
    await expect(push).toContainText(query);
  }
  await push.getByRole('button', { name: 'Options for Push' }).click();
  await push.getByRole('button', { name: 'Reorder exercises', exact: true }).click();
  await push.getByRole('button', { name: 'Move Dumbbell Shoulder Press up', exact: true }).click();
  await expect(push.locator('ol > li').first()).toContainText('Dumbbell Shoulder Press');
  await expect(push).toContainText('3 × 6–10');
  await page.getByRole('button', { name: 'Save Program', exact: true }).click();
  await page.reload();
  await push.getByRole('button', { name: 'Options for Push' }).click();
  await expect(push.getByLabel('Weekday for Push')).toHaveValue('1');
  await expect(push.locator('ol > li').first()).toContainText('Dumbbell Shoulder Press');
  await expect(page.getByRole('article', { name: /workout day/ })).toHaveCount(3);
});
