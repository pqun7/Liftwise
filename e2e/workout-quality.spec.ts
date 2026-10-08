import { openSavedEditor } from './programHelpers';
import { expect, test } from '@playwright/test';

test('Workout keeps one thumb action clear of navigation across mobile widths', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/plan/new');
  await page.getByLabel('Program name').fill('Workout quality');
  await openSavedEditor(page, 'Upper / Lower');
  const dayId = await page.evaluate(async () => {
    const request = indexedDB.open('liftwise');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open fixture data'));
    });
    const days = await new Promise<Array<{ id: string; name: string }>>((resolve, reject) => {
      const read = db.transaction('programDays').objectStore('programDays').getAll();
      read.onsuccess = () => resolve(read.result as Array<{ id: string; name: string }>);
      read.onerror = () => reject(read.error ?? new Error('Could not read fixture days'));
    });
    db.close();
    return days.find((day) => day.name === 'Upper A')?.id;
  });
  expect(dayId).toBeTruthy();
  await page.goto(`/workout?day=${dayId!}`);
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
      await page.getByRole('button', { name: `Start Set ${number + 1} now`, exact: true }).click();
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
