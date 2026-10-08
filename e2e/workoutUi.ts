import { expect, type Page } from '@playwright/test';

export async function expectProgressCounts(page: Page, workouts: number, sets: number) {
  for (const [label, value] of [
    ['Completed Workouts', workouts],
    ['Working Sets', sets],
  ] as const) {
    const card = page
      .getByRole('heading', { name: label, exact: true })
      .locator('xpath=ancestor::section[1]');
    await expect(card.getByText(String(value), { exact: true })).toBeVisible();
  }
}

export async function finishLogger(page: Page) {
  await expect(page.getByRole('button', { name: 'Saving set…', exact: true })).toHaveCount(0);
  if (await page.getByRole('heading', { name: 'Workout complete', exact: true }).isVisible()) {
    await page
      .getByRole('button', { name: 'Done', exact: true })
      .or(page.getByRole('link', { name: 'Done', exact: true }))
      .click();
    return;
  }
  const menu = page
    .locator('details')
    .filter({ has: page.getByLabel('Workout menu', { exact: true }) });
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await page.getByLabel('Workout menu', { exact: true }).click();
  }
  await menu.getByRole('button', { name: 'Finish Workout', exact: true }).click();
  const earlyFinish = page.getByRole('button', { name: 'Finish anyway', exact: true });
  if (await earlyFinish.isVisible()) await earlyFinish.click();
  await expect(page.getByText('Workout complete', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Done', exact: true })
    .or(page.getByRole('link', { name: 'Done', exact: true }))
    .click();
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
  await page.getByRole('link', { name: 'Resume Workout', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/workout/' + id));
}

export async function openWorkoutMenu(page: Page) {
  const menu = page
    .locator('details')
    .filter({ has: page.getByLabel('Workout menu', { exact: true }) });
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open)))
    await page.getByLabel('Workout menu', { exact: true }).click();
}
export async function openWorkoutOverview(page: Page) {
  if (await page.getByRole('region', { name: 'Workout Overview', exact: true }).isVisible()) return;
  await openWorkoutMenu(page);
  await page.getByRole('button', { name: 'Workout Overview', exact: true }).click();
}
