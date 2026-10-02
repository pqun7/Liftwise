import { expect, test, type Page } from '@playwright/test';
import { setOffline } from './offline';

async function audit(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  for (const field of await page
    .locator('.builder-page input:not([type=radio]), .builder-page textarea')
    .all())
    expect(
      await field.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    ).toBeGreaterThanOrEqual(16);
  await expect(
    page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Plan', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
}
test('guided Plan draft, exercise management, review and workout snapshots survive offline navigation', async ({
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
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
  await page.getByRole('button', { name: 'Next: Choose Days' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter a program name');
  await page.getByLabel('Program name').fill('Reference PPL');
  await page.getByLabel('Description or notes').fill('Durable builder plan');
  await page.getByRole('radio', { name: 'hypertrophy', exact: true }).check();
  for (const width of [320, 375, 390, 393, 402, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await audit(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('plan-basic.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next: Choose Days' }).click();
  await expect(page.getByRole('heading', { name: 'Training Days', exact: true })).toBeVisible();
  for (const width of [320, 375, 390, 393, 402, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await audit(page);
    for (const day of await page.locator('.builder-week button').all())
      expect((await day.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const next = page.getByRole('button', { name: 'Next: Add Exercises' });
  await next.scrollIntoViewIfNeeded();
  const nextBox = await next.boundingBox();
  const navigationBox = await page.locator('.bottom-nav').boundingBox();
  expect(nextBox!.y + nextBox!.height).toBeLessThanOrEqual(navigationBox!.y);
  await page.getByRole('button', { name: 'Monday', exact: true }).click();
  await page.getByRole('radio', { name: /Upper Lower/ }).check();
  await expect(page.getByRole('button', { name: 'Monday', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.getByRole('button', { name: 'Wednesday', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Monday', exact: true }).click();
  await page.getByRole('radio', { name: /Push Pull Legs/ }).check();
  await page.getByRole('button', { name: 'Next: Add Exercises' }).click();
  await expect(page.getByRole('heading', { name: 'Add Exercises', exact: true })).toBeVisible();
  const dayUrl = page.url();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Push Day', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Training Days', exact: true })).toBeVisible();
  await audit(page);
  await page.screenshot({ path: testInfo.outputPath('plan-days.png'), fullPage: true });
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect(page.getByLabel('Program name')).toHaveValue('Reference PPL');
  await expect(page.getByRole('radio', { name: 'hypertrophy', exact: true })).toBeChecked();
  await page.getByLabel('Program name').fill('Unsaved edit');
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Home', exact: true })
    .click();
  await expect(page.getByRole('alert', { name: 'Unsaved changes' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await page.getByLabel('Program name').fill('Reference PPL');
  await page.getByRole('button', { name: 'Next: Choose Days' }).click();
  await page.getByRole('button', { name: 'Next: Add Exercises' }).click();
  await setOffline(context, browserName, true);
  for (const query of ['Barbell Bench Press', 'Builder Custom Press']) {
    await page.getByRole('link', { name: 'Add exercise', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search exercises' }).fill(query);
    await page
      .getByRole('link', { name: new RegExp(query) })
      .first()
      .click();
    await page.getByLabel('Target sets').fill('3');
    await page.getByLabel('Minimum reps').fill('6');
    await page.getByLabel('Maximum reps').fill('8');
    await page.getByLabel('Minimum RIR').fill('1');
    await page.getByLabel('Maximum RIR').fill('2');
    await page.getByLabel('Rest duration in seconds').fill('180');
    await page.getByRole('button', { name: 'Add to day' }).click();
    await expect(page.getByRole('heading', { name: query, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Reorder Builder Custom Press' }).click();
  await page.getByRole('button', { name: 'Move Builder Custom Press up' }).click();
  await expect(page.locator('.builder-exercise').first()).toContainText('Builder Custom Press');
  await page.getByRole('link', { name: 'Pull Day', exact: true }).click();
  await expect(page.getByText('No exercises added yet.')).toBeVisible();
  await page.getByRole('link', { name: 'Push Day', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Builder Custom Press', exact: true }),
  ).toBeVisible();
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await audit(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('plan-exercises.png'), fullPage: true });
  await page.getByRole('link', { name: 'Next: Review' }).click();
  await expect(page.getByRole('heading', { name: 'Review Program', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Push Day review' })).toContainText(
    '3 sets · 6–8 reps · 1–2 RIR',
  );
  await page.screenshot({ path: testInfo.outputPath('plan-review.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save Program', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reference PPL', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Workout', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Start training' })).toBeVisible();
  await page
    .locator('.workout-day-list')
    .getByRole('button', { name: /Push Day/ })
    .click();
  await expect(page.getByText('3 sets · 6–8 reps · 1–2 RIR').first()).toBeVisible();
  await setOffline(context, browserName, false);
  await page.goto(dayUrl);
  await expect(page.locator('.builder-exercise').first()).toContainText('Builder Custom Press');
});
