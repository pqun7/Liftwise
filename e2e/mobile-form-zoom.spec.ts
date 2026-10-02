import { expect, test, type Locator, type Page } from '@playwright/test';
import { saveEmptyProgram } from './programHelpers';

async function assertMobileInputIsZoomSafe(locator: Locator) {
  await expect(locator).toBeVisible();
  const metrics = await locator.evaluate((control) => {
    const rect = control.getBoundingClientRect();
    return {
      fontSize: Number.parseFloat(getComputedStyle(control).fontSize),
      left: rect.left,
      right: rect.right,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
  expect(metrics.fontSize).toBeGreaterThanOrEqual(16);
  expect(metrics.left).toBeGreaterThanOrEqual(-1);
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
}

async function assertNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
}

test('mobile editable controls have zoom-safe computed typography and an unrestricted viewport', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'webkit', 'Mobile WebKit is the iPhone regression target.');
  test.setTimeout(90_000);

  await page.goto('/plan/new');
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toContain('width=device-width');
  expect(viewport).toContain('initial-scale=1');
  expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?(?:\s|,|$)/i);
  await assertMobileInputIsZoomSafe(page.getByLabel('Program name'));
  await expect(page.getByLabel('Program name')).not.toBeFocused();
  await assertMobileInputIsZoomSafe(page.getByLabel('Description or notes'));
  for (const width of [320, 375, 390, 393, 414, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await assertMobileInputIsZoomSafe(page.getByLabel('Program name'));
    await assertMobileInputIsZoomSafe(page.getByLabel('Description or notes'));
    await assertNoHorizontalOverflow(page);
  }

  await page.getByLabel('Program name').fill('Zoom Safe Plan');
  await page.getByLabel('Program name').press('Enter');
  await saveEmptyProgram(page, true);
  await page.getByRole('link', { name: '+ Day' }).click();
  await expect(page.getByLabel('Day name')).not.toBeFocused();
  await assertMobileInputIsZoomSafe(page.getByLabel('Day name'));
  await assertMobileInputIsZoomSafe(page.getByLabel('Day notes'));

  await page.getByLabel('Day name').fill('Push Day');
  await page.getByLabel('Day name').press('Enter');
  await page.getByRole('link', { name: 'Add exercise' }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Barbell Bench Press');
  await page
    .getByRole('link', { name: /Barbell Bench Press/ })
    .first()
    .click();
  for (const label of [
    'Target sets',
    'Minimum reps',
    'Maximum reps',
    'Minimum RIR',
    'Maximum RIR',
    'Rest duration in seconds',
    'Exercise notes',
  ]) {
    await assertMobileInputIsZoomSafe(page.getByLabel(label));
  }
  for (const width of [320, 375, 390, 393, 414, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await assertMobileInputIsZoomSafe(page.getByLabel('Minimum reps'));
    await assertMobileInputIsZoomSafe(page.getByLabel('Maximum reps'));
    await assertNoHorizontalOverflow(page);
  }

  await page.goto('/exercises/new');
  await assertMobileInputIsZoomSafe(page.getByLabel('Name'));
  await page.goto('/exercises');
  await assertMobileInputIsZoomSafe(page.getByRole('searchbox', { name: 'Search exercises' }));
  await page.goto('/settings/data-safety');
  await assertMobileInputIsZoomSafe(page.getByLabel('Type DELETE to confirm'));

  for (const width of [320, 375, 390, 393, 414, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await assertMobileInputIsZoomSafe(page.getByLabel('Type DELETE to confirm'));
    await assertNoHorizontalOverflow(page);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workout');
  await page.getByRole('button', { name: /Start Quick Workout/ }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Workout Overview', exact: true }).click();
  await assertMobileInputIsZoomSafe(page.getByLabel('Workout notes'));
  await page.getByRole('link', { name: 'Add Exercise' }).click();
  await assertMobileInputIsZoomSafe(page.getByRole('searchbox', { name: 'Search exercises' }));
  await assertMobileInputIsZoomSafe(page.getByLabel('Body part'));
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Barbell Bench Press');
  await page
    .getByRole('button', { name: /Barbell Bench Press/ })
    .first()
    .click();
  for (const label of ['Set 1 weight', 'Set 1 reps', 'Set 1 RIR']) {
    await assertMobileInputIsZoomSafe(page.getByLabel(label, { exact: true }));
  }
  await page.getByRole('button', { name: 'Workout Overview', exact: true }).click();
  await assertMobileInputIsZoomSafe(page.getByLabel('Set 1 type', { exact: true }));
});
