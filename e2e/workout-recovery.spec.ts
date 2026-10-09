import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { openLegacyUnplannedFixture, openWorkoutMenu } from './workoutUi';

async function fixture(page: Page) {
  await page.goto('/exercises/new');
  await page.getByLabel('Name', { exact: true }).fill('Recovery Bench');
  await page.getByLabel('Primary muscle').fill('Chest');
  await page.getByLabel('Primary muscle').press('Enter');
  await expect(page.getByRole('heading', { name: 'Recovery Bench', exact: true })).toBeVisible();
  const exerciseId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1)!);
  await page.goto('/workout');
  await openLegacyUnplannedFixture(page);
  const sessionId = new URL(page.url()).pathname.split('/').at(-1)!;
  await page.evaluate(
    async ({ exerciseId, sessionId }) => {
      const request = indexedDB.open('liftwise');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(request.error?.message ?? 'Database unavailable'));
      });
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(
          ['workoutSessions', 'workoutExercises', 'workoutSets'],
          'readwrite',
        );
        const sessions = tx.objectStore('workoutSessions');
        const session = sessions.get(sessionId);
        session.onsuccess = () =>
          sessions.put({
            ...session.result,
            currentExerciseId: id,
            startedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
            updatedAt: now,
          });
        tx.objectStore('workoutExercises').add({
          id,
          workoutSessionId: sessionId,
          exerciseId,
          exerciseName: 'Recovery Bench',
          programExerciseId: null,
          order: 1,
          plannedTargetSets: 3,
          plannedMinReps: 8,
          plannedMaxReps: 10,
          plannedRirMin: null,
          plannedRirMax: null,
          plannedRestSeconds: 120,
          plannedNotes: null,
          notes: null,
          createdAt: now,
          updatedAt: now,
        });
        for (let number = 1; number <= 3; number++)
          tx.objectStore('workoutSets').add({
            id: crypto.randomUUID(),
            workoutExerciseId: id,
            setNumber: number,
            setType: 'working',
            weight: 40,
            reps: 8,
            rir: 2,
            completed: false,
            createdAt: now,
            updatedAt: now,
          });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error(tx.error?.message ?? 'Transaction failed'));
      });
      db.close();
    },
    { exerciseId, sessionId },
  );
  await page.reload();
  await expect(page.getByRole('region', { name: 'Set logger' })).toBeVisible();
  return sessionId;
}

test('leaving a workout child route pauses it and synchronizes another open window', async ({
  page,
  context,
}) => {
  const id = await fixture(page);
  const other = await context.newPage();
  await other.goto(`/workout/${id}`);
  await expect(other.getByRole('region', { name: 'Set logger' })).toBeVisible();
  await page.goto(`/workout/${id}/exercises`);
  await expect(page.getByRole('heading', { name: 'Add to this workout' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Home', exact: true })
    .click();
  await expect(page.getByRole('link', { name: 'Return to saved workout' })).toBeVisible();
  await expect(other.getByText('Workout paused', { exact: true })).toBeVisible();
  await other.getByRole('button', { name: 'Resume Workout', exact: true }).click();
  await expect(other.getByRole('region', { name: 'Set logger' })).toBeVisible();
  await expect(page.locator('.session-return-bar')).toContainText('In progress');
  await other.close();
});

test('saves and pauses on exit, keeps Continue visible, and freezes rest until explicit resume', async ({
  page,
}, testInfo) => {
  await fixture(page);
  await page.getByRole('button', { name: 'Complete set', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Rest timer' })).toBeVisible();
  const start = page.getByRole('button', { name: 'Start Set 2 now', exact: true });
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  const action = await start.boundingBox();
  const bottom = await nav.boundingBox();
  expect(action!.y + action!.height).toBeLessThanOrEqual(bottom!.y);
  expect(action!.y).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('rest-docked.png') });
  await page.getByRole('link', { name: 'Leave workout, keep session saved' }).click();
  await page.getByRole('button', { name: 'Save & Pause', exact: true }).click();
  await expect(page).toHaveURL('/');
  const resume = page.getByRole('link', { name: 'Return to saved workout', exact: true });
  await expect(resume).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const visible = await resume.boundingBox();
  expect(visible!.y).toBeGreaterThanOrEqual(0);
  expect(visible!.y + visible!.height).toBeLessThan(200);
  await resume.click();
  await expect(page.getByText('Workout paused', { exact: true })).toBeVisible();
  const timer = page.getByRole('timer');
  const paused = await timer.textContent();
  await expect(timer).toHaveText(paused!);
  await page.waitForTimeout(1500);
  await expect(timer).toHaveText(paused!);
  await page.getByRole('button', { name: 'Resume Workout', exact: true }).click();
  await expect(page.getByText('Workout paused', { exact: true })).toHaveCount(0);
  await expect(start).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const back = await page
    .getByRole('link', { name: 'Leave workout, keep session saved' })
    .boundingBox();
  expect(back!.y).toBeGreaterThanOrEqual(0);
  expect(back!.y).toBeLessThan(100);
});

test('recovers an interrupted session, retains sets, finishes recorded work, and permits another workout', async ({
  page,
}) => {
  const sessionId = await fixture(page);
  await page.getByRole('button', { name: 'Complete set', exact: true }).click();
  await page.evaluate(async (id) => {
    const request = indexedDB.open('liftwise');
    const db = await new Promise<IDBDatabase>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('workoutSessions', 'readwrite');
      const table = tx.objectStore('workoutSessions');
      const record = table.get(id);
      record.onsuccess = () => {
        const seenAt = new Date(Date.now() - 8 * 60_000).toISOString();
        table.put({
          ...record.result,
          presence: { terminated: { seenAt, hiddenAt: null } },
          updatedAt: new Date().toISOString(),
        });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(tx.error?.message ?? 'Transaction failed'));
    });
    db.close();
  }, sessionId);
  await page.reload();
  await expect(page.getByText('Your progress is saved. Time away was excluded.')).toBeVisible();
  await expect(page.getByLabel('Correct workout duration (minutes)')).toBeVisible();
  await page.getByLabel('Correct workout duration (minutes)').fill('15');
  await page.getByRole('button', { name: 'Save duration', exact: true }).click();
  await expect(page.getByLabel('Correct workout duration (minutes)')).toHaveCount(0);
  await page.getByRole('link', { name: 'Leave workout, keep session saved' }).click();
  await page.getByRole('button', { name: 'Save & Pause', exact: true }).click();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Finish recorded workout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout complete', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Return to saved workout', exact: true }),
  ).toHaveCount(0);
  await openLegacyUnplannedFixture(page);
  await expect(
    page.getByRole('heading', { name: 'Legacy unplanned workout', exact: true, level: 1 }),
  ).toBeVisible();
});

test('timer ticks avoid database work and warm actions remain responsive', async ({
  page,
}, testInfo) => {
  await fixture(page);
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const state = { reads: 0, writes: 0 };
    Object.assign(window, { workoutIdleMetrics: state });
    for (const method of ['get', 'getAll', 'openCursor', 'put'] as const) {
      const original = Object.getOwnPropertyDescriptor(IDBObjectStore.prototype, method)!.value as (
        this: IDBObjectStore,
        ...args: unknown[]
      ) => IDBRequest<unknown>;
      Object.defineProperty(IDBObjectStore.prototype, method, {
        configurable: true,
        value: function (this: IDBObjectStore, ...args: unknown[]) {
          if (method === 'put') state.writes++;
          else state.reads++;
          return original.apply(this, args);
        },
      });
    }
  });
  const timer = page.getByLabel('Elapsed workout time');
  const initial = await timer.textContent();
  await expect(timer).not.toHaveText(initial!, { timeout: 3000 });
  const metrics = await page.evaluate(
    () =>
      (window as unknown as { workoutIdleMetrics: { reads: number; writes: number } })
        .workoutIdleMetrics,
  );
  expect(metrics.writes).toBe(0);
  expect(metrics.reads).toBe(0);
  const started = Date.now();
  await page.getByRole('button', { name: 'Complete set', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Rest timer' })).toBeVisible();
  const completionMs = Date.now() - started;
  expect(completionMs).toBeLessThan(3000);
  await openWorkoutMenu(page);
  const performancePath = testInfo.outputPath('workout-performance.json');
  await writeFile(
    performancePath,
    JSON.stringify({ project: testInfo.project.name, idle: metrics, completionMs }),
  );
  await testInfo.attach('workout-performance.json', {
    path: performancePath,
    contentType: 'application/json',
  });
});
