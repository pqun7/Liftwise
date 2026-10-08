import { expect, test } from '@playwright/test';
import { setOffline } from './offline';

for (const timezoneId of ['Africa/Cairo', 'America/Los_Angeles']) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId });
    test('restores Saturday offline and keeps Sunday schedule separate across all four screens', async ({
      page,
      context,
      browserName,
    }) => {
      await page.clock.install({ time: new Date('2026-10-04T12:00:00Z') });
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'No workout today' })).toBeVisible();
      await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
      await page.evaluate(async () => {
        const request = indexedDB.open('liftwise');
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error('Could not open calendar fixture storage'));
        });
        const tx = db.transaction(
          [
            'programs',
            'programDays',
            'programExercises',
            'appSettings',
            'exercises',
            'workoutSessions',
            'workoutExercises',
            'workoutSets',
          ],
          'readwrite',
        );
        const stamp = new Date(2026, 9, 3, 20).toISOString();
        const timestamps = { createdAt: stamp, updatedAt: stamp };
        const programId = crypto.randomUUID(),
          sessionId = crypto.randomUUID(),
          workoutExerciseId = crypto.randomUUID();
        {
          const exerciseId = crypto.randomUUID();
          const exercise = {
            id: exerciseId,
            sourceProvider: 'custom',
            sourceId: exerciseId,
            name: 'Calendar Squat',
            description: null,
            instructions: [],
            tips: [],
            category: null,
            forceType: null,
            mechanic: null,
            difficulty: null,
            equipment: null,
            bodyPart: null,
            primaryMuscles: ['quads'],
            secondaryMuscles: [],
            goals: [],
            tags: [],
            met: null,
            isUnilateral: false,
            isBodyweight: false,
            images: { start: null, peak: null, main: null },
            localizations: {
              en: { name: 'Calendar Squat', description: null, instructions: [], tips: [] },
            },
            importedAt: null,
            isActive: true,
            searchText: 'calendar squat',
            notes: null,
            ...timestamps,
          };
          tx.objectStore('exercises').put(exercise);
          tx.objectStore('programs').put({
            id: programId,
            name: 'Calendar QA',
            archived: false,
            draft: false,
            description: null,
            ...timestamps,
          });
          tx.objectStore('appSettings').put({
            key: 'activeProgramId',
            value: programId,
            ...timestamps,
          });
          for (const [order, name, weekday] of [
            [1, 'Push A', 0],
            [2, 'Legs B', 5],
          ] as const) {
            const dayId = crypto.randomUUID(),
              prescriptionId = crypto.randomUUID();
            tx.objectStore('programDays').put({
              id: dayId,
              programId,
              name,
              weekday,
              order,
              notes: null,
              ...timestamps,
            });
            tx.objectStore('programExercises').put({
              id: prescriptionId,
              programDayId: dayId,
              exerciseId: exercise.id,
              order: 1,
              targetSets: 12,
              minReps: 8,
              maxReps: 12,
              targetRirMin: null,
              targetRirMax: null,
              restSeconds: 60,
              notes: null,
              ...timestamps,
            });
            if (weekday === 5) {
              tx.objectStore('workoutSessions').put({
                id: sessionId,
                programId,
                programDayId: dayId,
                name,
                status: 'active',
                startedAt: stamp,
                scheduledDate: '2026-10-03',
                endedAt: null,
                pausedAt: null,
                pausedDurationSeconds: 0,
                currentExerciseId: workoutExerciseId,
                restStartedAt: null,
                restEndsAt: null,
                notes: null,
                ...timestamps,
              });
              tx.objectStore('workoutExercises').put({
                id: workoutExerciseId,
                workoutSessionId: sessionId,
                exerciseId: exercise.id,
                programExerciseId: prescriptionId,
                exerciseName: exercise.name,
                order: 1,
                plannedTargetSets: 12,
                plannedMinReps: 8,
                plannedMaxReps: 12,
                plannedRirMin: null,
                plannedRirMax: null,
                plannedRestSeconds: 60,
                plannedNotes: null,
                notes: null,
                ...timestamps,
              });
              for (let set = 1; set <= 12; set++)
                tx.objectStore('workoutSets').put({
                  id: crypto.randomUUID(),
                  workoutExerciseId,
                  setNumber: set,
                  setType: 'working',
                  weight: set <= 2 ? 50 : null,
                  reps: set <= 2 ? 8 : null,
                  rir: null,
                  completed: set <= 2,
                  ...timestamps,
                });
            }
          }
        }
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error('Calendar fixture transaction failed'));
          tx.onabort = () => reject(tx.error ?? new Error('Calendar fixture transaction aborted'));
        });
        db.close();
      });
      await page.getByRole('link', { name: 'Home', exact: true }).click();
      await page.reload();
      await expect(page.locator('.home-hero')).toContainText('Legs B');
      await expect(page.locator('.home-hero')).toContainText('10 sets left');
      await expect(page.locator('.home-hero')).toContainText('Started Saturday');
      const today = page
        .locator('section.home-section')
        .filter({ has: page.getByRole('heading', { name: 'Today', exact: true }) });
      await expect(today).toContainText('Rest Day');
      await expect(today).not.toContainText('Legs B');
      await expect(page.getByRole('button', { name: /Sun.*today/ })).toBeVisible();
      await page.getByRole('link', { name: 'Plan', exact: true }).click();
      const nextWorkout = page.getByRole('link', { name: /^Push A.*Mon, Oct 5/ });
      await expect(nextWorkout).toContainText('Mon, Oct 5');
      await page.getByRole('link', { name: 'Workout', exact: true }).click();
      await expect(page.getByRole('link', { name: 'Resume Workout' })).toBeVisible();
      await expect(page.getByText(/Active session · Started Saturday/)).toBeVisible();
      await page.getByRole('link', { name: 'Progress', exact: true }).click();
      await expect(page.locator('[aria-current="date"]')).toHaveAttribute(
        'aria-label',
        /Sunday.*Rest day.*today/i,
      );
      await setOffline(context, browserName, true);
      await page.getByRole('link', { name: 'Home', exact: true }).click();
      await expect(today).toContainText('Rest Day');
      if (browserName !== 'webkit') {
        await page.reload();
        await expect(today).toContainText('Rest Day');
      }
      await setOffline(context, browserName, false);
      // The open Home screen rolls into Monday without reloading or mutating the session.
      await page.clock.setSystemTime(new Date('2026-10-05T12:00:00Z'));
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(today).toContainText('Push A');
      await expect(page.locator('.home-hero')).toContainText('Started Saturday');
    });
    test('uses local midnight and calendar days through DST changes', async ({ page }) => {
      await page.clock.install({ time: new Date('2026-10-04T12:00:00Z') });
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Welcome to Liftwise' })).toBeVisible();
      // Cairo's early morning is still Saturday UTC; LA's late evening is Monday UTC.
      const boundary = await page.evaluate(
        (zone) => new Date(2026, 9, 4, zone === 'Africa/Cairo' ? 0 : 23, 5).getTime(),
        timezoneId,
      );
      await page.clock.setSystemTime(boundary);
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(page.getByRole('button', { name: /Sun.*today/ })).toBeVisible();
      const before = await page.evaluate(() => new Date(2026, 9, 3, 23, 59, 59).getTime());
      await page.clock.setSystemTime(before);
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(page.getByRole('button', { name: /Sat.*today/ })).toBeVisible();
      await page.clock.runFor(1100);
      await expect(page.getByRole('button', { name: /Sun.*today/ })).toBeVisible();
      for (const [month, day] of [
        [2, 7],
        [9, 31],
        [9, 29],
      ]) {
        const dates = await page.evaluate(
          ({ month, day }) => {
            const date = new Date(2026, month, day, 23, 59, 59);
            const next = new Date(2026, month, day + 1, 0);
            return {
              before: date.getTime(),
              delay: next.getTime() - date.getTime(),
              label: next.toLocaleDateString('en', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              }),
            };
          },
          { month: month!, day: day! },
        );
        await page.clock.setSystemTime(dates.before);
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await page.clock.runFor(dates.delay + 100);
        await expect(
          page.getByRole('button', { name: `${dates.label}, today, no completed workouts` }),
        ).toBeVisible();
      }
    });
  });
}
