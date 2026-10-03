import { expect, test } from '@playwright/test';

test('Workout keeps one thumb action clear of navigation across mobile widths', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/plan/new');
  await page.getByLabel('Program name').fill('Workout quality');
  await page.getByRole('button', { name: 'Next: Choose Days' }).click();
  await page.getByRole('button', { name: /Upper.*Lower/ }).click();
  await page.getByRole('button', { name: 'Use This Template' }).click();
  await page.getByRole('button', { name: 'Save Program', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
  await page.goto('/workout');
  await page.getByRole('button', { name: 'Upper A', exact: true }).click();
  const start = page.getByRole('button', { name: 'Start Workout', exact: true });
  for (const width of [320, 360, 375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(start).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const action = await start.boundingBox();
    const nav = await page.getByRole('navigation', { name: 'Primary navigation' }).boundingBox();
    expect(action!.height).toBeGreaterThanOrEqual(54);
    expect(action!.y + action!.height).toBeLessThanOrEqual(nav!.y);
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await start.click();
  await expect(page.getByText('1 of 6 exercises', { exact: false })).toBeVisible();
  const logger = page.getByRole('region', { name: 'Set logger' });
  for (const number of [1, 2, 3]) {
    await logger.getByLabel(`Set ${number} weight`, { exact: true }).fill('62.5');
    await logger.getByLabel(`Set ${number} reps`, { exact: true }).fill('8');
    await logger.getByRole('button', { name: 'Complete set', exact: true }).click();
    if (number < 3) {
      await expect(page.getByRole('region', { name: 'Rest timer' })).toBeVisible();
      await page.getByRole('button', { name: `Start Set ${number + 1}`, exact: true }).click();
    } else await expect(page.getByRole('region', { name: 'Exercise complete' })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Next Exercise' }).click();
  await expect(page.getByText('2 of 6 exercises', { exact: false })).toBeVisible();
  await expect(page.locator('.workout-progress-connector.is-done')).toHaveCount(1);
  await expect(page.locator('.workout-progress-node.is-current')).toHaveCount(1);
  for (const width of [320, 360, 375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`logger-progress-${width}.png`) });
  }
  expect(errors).toEqual([]);
});
