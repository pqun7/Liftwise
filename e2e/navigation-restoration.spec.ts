import { expect, test, type Page } from '@playwright/test';
import type {
  Exercise,
  Program,
  ProgramDay,
  ProgramExercise,
  WorkoutSet,
  WorkoutSession,
} from '../src/domain/entities';
import { openWorkoutOverview } from './workoutUi';

async function seedProgram(page: Page) {
  await page.goto('/exercises');
  await expect(page.getByRole('link', { name: /^View / }).first()).toBeVisible({ timeout: 20_000 });
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('liftwise');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(new Error(r.error?.message ?? 'IndexedDB request failed'));
    });
    const originals = await new Promise<Exercise[]>((resolve, reject) => {
      const r = db.transaction('exercises').objectStore('exercises').getAll();
      r.onsuccess = () => resolve(r.result as Exercise[]);
      r.onerror = () => reject(new Error(r.error?.message ?? 'IndexedDB request failed'));
    });
    const now = new Date();
    const timestamp = now.toISOString();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const program: Program = {
      id: crypto.randomUUID(),
      name: 'Navigation QA',
      description: null,
      archived: false,
      draft: false,
      scheduleType: 'weekly',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const day: ProgramDay = {
      id: crypto.randomUUID(),
      programId: program.id,
      name: 'Upper B',
      order: 1,
      weekday: (now.getDay() + 6) % 7,
      notes: null,
      kind: 'workout',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const exercises: Exercise[] = Array.from({ length: 6 }, (_, index) => {
      const id = crypto.randomUUID();
      const name = `Movement ${index + 1} with a deliberately long exercise name for narrow screen review`;
      return {
        ...originals[0]!,
        id,
        sourceId: id,
        sourceProvider: 'custom',
        name,
        images: { main: null, start: null, peak: null },
        searchText: name.toLowerCase(),
        localizations: { en: { name, description: null, instructions: [], tips: [] } },
      };
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ['programs', 'programDays', 'programExercises', 'appSettings', 'exercises'],
        'readwrite',
      );
      tx.objectStore('programs').add(program);
      tx.objectStore('programDays').add(day);
      tx.objectStore('appSettings').put({
        key: 'activeProgramId',
        value: program.id,
        updatedAt: timestamp,
      });
      exercises.forEach((exercise, index) => {
        tx.objectStore('exercises').add(exercise);
        const prescription: ProgramExercise = {
          id: crypto.randomUUID(),
          programDayId: day.id,
          exerciseId: exercise.id,
          order: index + 1,
          targetSets: 1,
          minReps: 8,
          maxReps: 8,
          targetRirMin: null,
          targetRirMax: null,
          restSeconds: 0,
          notes: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        tx.objectStore('programExercises').add(prescription);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(tx.error?.message ?? 'IndexedDB transaction failed'));
    });
    db.close();
    return { date, dayId: day.id, firstName: exercises[0]!.name };
  });
}

async function savedSessions(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('liftwise');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(new Error(r.error?.message ?? 'IndexedDB request failed'));
    });
    const sessions = await new Promise<WorkoutSession[]>((resolve, reject) => {
      const r = db.transaction('workoutSessions').objectStore('workoutSessions').getAll();
      r.onsuccess = () => resolve(r.result as WorkoutSession[]);
      r.onerror = () => reject(new Error(r.error?.message ?? 'IndexedDB request failed'));
    });
    db.close();
    return sessions;
  });
}

test('details Back restores workout overview, scroll and committed drafts; completion survives reopen without duplicates', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const fixture = await seedProgram(page);
  await page.goto('/workout');
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Upper B', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/workout\/[a-f0-9-]+$/);
  const sessionUrl = page.url();
  await page.getByLabel('Set 1 weight', { exact: true }).fill('25');
  await page.getByLabel('Set 1 reps', { exact: true }).fill('8');
  await openWorkoutOverview(page);
  const first = page.getByRole('article', { name: fixture.firstName, exact: true });
  await first.getByRole('link', { name: fixture.firstName, exact: true }).scrollIntoViewIfNeeded();
  await first.getByRole('link', { name: fixture.firstName, exact: true }).focus();
  const before = await page.evaluate(() => scrollY);
  await first.getByRole('link', { name: fixture.firstName, exact: true }).press('Enter');
  await expect(page.getByRole('heading', { name: fixture.firstName, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Workout', exact: true }).click();
  await expect(page).toHaveURL(sessionUrl);
  await expect(page.getByRole('region', { name: 'Workout Overview', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before - 3);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(before + 3);
  await expect(first.getByLabel('Set 1 weight', { exact: true })).toHaveValue('25');
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 780 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: testInfo.outputPath('restored-workout.png'), fullPage: true });
  // Prepare the final-set fixture; completion itself must run through the real logging action.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('liftwise');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(new Error(r.error?.message ?? 'IndexedDB request failed'));
    });
    const sets = await new Promise<WorkoutSet[]>((resolve, reject) => {
      const r = db.transaction('workoutSets').objectStore('workoutSets').getAll();
      r.onsuccess = () => resolve(r.result as WorkoutSet[]);
      r.onerror = () => reject(new Error(r.error?.message ?? 'IndexedDB request failed'));
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['workoutSets', 'workoutSessions'], 'readwrite');
      sets.forEach((set, index) =>
        tx
          .objectStore('workoutSets')
          .put({ ...set, weight: 25, reps: 8, completed: index < sets.length - 1 }),
      );
      const request = tx.objectStore('workoutSessions').getAll();
      request.onsuccess = () => {
        const session = (request.result as WorkoutSession[])[0]!;
        tx.objectStore('workoutSessions').put({
          ...session,
          currentExerciseId: sets.at(-1)!.workoutExerciseId,
        });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(tx.error?.message ?? 'IndexedDB transaction failed'));
    });
    db.close();
  });
  await page.reload();
  await page.getByRole('button', { name: 'Complete set', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout complete', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('completed-workout.png'), fullPage: true });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'View Completed Workout', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('link', { name: 'View Completed Workout', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Workout', exact: true })).toHaveCount(0);
  await page.goto('/workout?day=' + fixture.dayId);
  await expect(
    page.getByRole('link', { name: 'View Completed Workout', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Workout', exact: true })).toHaveCount(0);
  await page.goto('/?app=1');
  await expect(page.getByText('Completed today', { exact: true }).first()).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 });
  const today = page.locator('.calendar-day[aria-current="date"]');
  await expect(today).toHaveAttribute('data-status', 'completed');
  await expect(today).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: testInfo.outputPath('home-completed-360.png'), fullPage: true });
  await page.getByRole('link', { name: 'View Completed Workout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Session recap' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Start|Continue|Undo|Finish/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Session recap' })).toBeVisible();
  await page.goto('/plan');
  await expect(page.locator('.calendar-day')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'View Summary' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('plan-completed-360.png'), fullPage: true });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '150%';
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('link', { name: 'View Summary' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('plan-text-scale-150.png'), fullPage: true });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  await page.goto('/plan/calendar');
  await expect(
    page.locator('.calendar-day-link[aria-current="date"] .calendar-day-marker'),
  ).toHaveAttribute('data-status', 'completed');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('monthly-completed-360.png'), fullPage: true });
  const sessions = await savedSessions(page);
  expect(sessions).toHaveLength(1);
  expect(sessions[0]).toMatchObject({ status: 'completed', scheduledDate: fixture.date });
});

test('library search and Home selected date survive child routes and tab switching', async ({
  page,
}) => {
  await seedProgram(page);
  await page.goto('/exercises');
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Movement 1');
  await page.getByRole('link', { name: /^View Movement 1/ }).click();
  await page.getByRole('button', { name: 'Exercise library', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Search exercises' })).toHaveValue('Movement 1');
  await page.goto('/?app=1');
  const other = page.locator('.home-week .calendar-day:not([aria-current="date"])').first();
  const label = await other.getAttribute('aria-label');
  await other.click();
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Progress', exact: true })
    .click();
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Home', exact: true })
    .click();
  await expect(page.getByRole('button', { name: label!, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
