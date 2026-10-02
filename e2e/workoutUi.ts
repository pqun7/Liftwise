import { expect, type Page } from '@playwright/test';

export async function finishLogger(page: Page) {
  const menu = page
    .locator('details')
    .filter({ has: page.getByLabel('Workout menu', { exact: true }) });
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await page.getByLabel('Workout menu', { exact: true }).click();
  }
  await menu.getByRole('button', { name: 'Finish Workout', exact: true }).click();
  await expect(page.getByText('Workout complete', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Start training' })).toBeVisible();
}

/** Test-only legacy data: removed creation UI must not break existing unplanned sessions. */
export async function openLegacyUnplannedFixture(page: Page) {
  const id = await page.evaluate(async () => {
    const request = indexedDB.open('liftwise');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error(request.error?.message ?? 'Fixture database failed'));
    });
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('workoutSessions', 'readwrite');
      transaction.objectStore('workoutSessions').add({
        id,
        name: 'Legacy unplanned workout',
        programId: null,
        programDayId: null,
        status: 'active',
        startedAt: now,
        createdAt: now,
        updatedAt: now,
        endedAt: null,
        pausedAt: null,
        pausedDurationSeconds: 0,
        currentExerciseId: null,
        restStartedAt: null,
        restEndsAt: null,
        notes: null,
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(new Error(transaction.error?.message ?? 'Fixture transaction failed'));
      transaction.onabort = () =>
        reject(new Error(transaction.error?.message ?? 'Fixture transaction failed'));
    });
    database.close();
    return id;
  });
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await page.getByRole('link', { name: 'Workout', exact: true }).click();
  await page.getByRole('link', { name: 'Continue Workout', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/workout/' + id));
}
