import { expect, test } from '@playwright/test';

test('progress screens retain compact layouts and real interactions at mobile widths', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
  await expect(
    page.getByText('No completed workouts in this period.', { exact: false }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const request = indexedDB.open('liftwise');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Fixture database failed'));
    });
    const tx = db.transaction(
      ['workoutSessions', 'workoutExercises', 'workoutSets', 'bodyMetrics'],
      'readwrite',
    );
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 8);
      date.setTime(date.getTime() - 3600000);
      const stamp = date.toISOString(),
        id = crypto.randomUUID(),
        entry = crypto.randomUUID();
      tx.objectStore('workoutSessions').put({
        id,
        name: ['Push Day', 'Pull Day', 'Legs Day'][i % 3],
        programId: null,
        programDayId: null,
        status: 'completed',
        startedAt: stamp,
        endedAt: new Date(date.getTime() + 3100000).toISOString(),
        pausedAt: null,
        pausedDurationSeconds: 0,
        currentExerciseId: null,
        restStartedAt: null,
        restEndsAt: null,
        notes: null,
        createdAt: stamp,
        updatedAt: stamp,
      });
      tx.objectStore('workoutExercises').put({
        id: entry,
        workoutSessionId: id,
        exerciseId: i % 3 === 2 ? 'repdb:visual-squat' : 'repdb:visual-bench',
        exerciseName: i % 3 === 2 ? 'Squat' : 'Bench Press',
        programExerciseId: null,
        order: 1,
        plannedTargetSets: null,
        plannedMinReps: null,
        plannedMaxReps: null,
        plannedRirMin: null,
        plannedRirMax: null,
        plannedRestSeconds: null,
        plannedNotes: null,
        notes: null,
        createdAt: stamp,
        updatedAt: stamp,
      });
      for (let j = 0; j < 4; j++)
        tx.objectStore('workoutSets').put({
          id: crypto.randomUUID(),
          workoutExerciseId: entry,
          setNumber: j + 1,
          setType: j === 3 ? 'warmup' : 'working',
          weight: 100 - i * 2.5,
          reps: 8,
          rir: 2,
          completed: true,
          createdAt: stamp,
          updatedAt: stamp,
        });
      tx.objectStore('bodyMetrics').put({
        id: crypto.randomUUID(),
        measuredAt: stamp,
        weight: 72.4 + i * 0.2,
        bodyFatPercentage: 14.2 + i * 0.15,
        waistCm: 78 + i * 0.3,
        chestCm: 94 - i * 0.2,
        armsCm: 32,
        legsCm: 58,
        notes: null,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Fixture transaction failed'));
    });
    db.close();
  });
  for (const width of [320, 360, 375, 390, 393, 402, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [route, title, name] of [
      ['/progress', 'Progress', 'overview'],
      ['/progress/history', 'Workout History', 'history'],
      ['/progress/exercises/repdb:visual-bench', 'Exercise Insights', 'exercise'],
      ['/progress/measurements', 'Body Measurements', 'measurements'],
    ]) {
      await page.goto(route!);
      await expect(page.getByRole('heading', { name: title!, exact: true })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole('heading', { name: 'Progress unavailable' })).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      if (name === 'overview') {
        await expect(page.locator('.streak-week > li')).toHaveCount(7);
        for (const target of await page
          .locator(
            '.streak-badge, .streak-heading, .progress-activity-heading, .progress-explore-link',
          )
          .all()) {
          const box = await target.boundingBox();
          expect(box!.height).toBeGreaterThanOrEqual(44);
          expect(box!.width).toBeGreaterThanOrEqual(44);
        }
        await expect(page.locator('.streak-badge-copy')).toHaveText('1 day streak');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      await expect(
        page
          .getByRole('navigation', { name: 'Primary navigation' })
          .getByRole('link', { name: 'Progress', exact: true }),
      ).toHaveAttribute('aria-current', 'page');
      await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true });
      if (name === 'overview') {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const last = await page.locator('.progress-explore-link').last().boundingBox();
        const nav = await page
          .getByRole('navigation', { name: 'Primary navigation' })
          .boundingBox();
        expect(last!.y + last!.height).toBeLessThanOrEqual(nav!.y);
        await page.screenshot({ path: testInfo.outputPath(`overview-bottom-${width}.png`) });
      }
    }
  }
  await page.goto('/progress');
  await expect(page.getByText('36', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: '7D', exact: true }).click();
  await expect(page.getByText('3', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Workout History View/ }).click();
  await page.getByRole('button', { name: 'Push Day', exact: true }).click();
  await expect(page.locator('main ul').getByRole('link')).toHaveCount(4);
  const newest = await page.locator('main ul').getByRole('link').first().getAttribute('href');
  await page.getByLabel('Sort workouts').selectOption('oldest');
  expect(await page.locator('main ul').getByRole('link').first().getAttribute('href')).not.toBe(
    newest,
  );
  await page.getByRole('link', { name: 'Back to Progress' }).click();
  await page.getByRole('link', { name: /Exercise Insights Analyze/ }).click();
  await page.getByRole('link', { name: 'Bench Press', exact: true }).click();
  await page.getByLabel('Exercise', { exact: true }).selectOption({ label: 'Squat' });
  await expect(page).toHaveURL(/visual-squat/);
  await page.getByLabel('Chart metric').selectOption('volume');
  await page.getByRole('radio', { name: 'ALL', exact: true }).click();
  await page.getByText('Chart values and session links', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'Volume (kg·reps)' })).toContainText('1,740');
  await page.locator('.recharts-surface').click({ position: { x: 140, y: 80 } });
  await expect(page.locator('.recharts-tooltip-wrapper')).toContainText('RIR 2');
  await page.screenshot({ path: testInfo.outputPath('exercise-tooltip.png'), fullPage: true });
  await page.getByRole('link', { name: 'Back to Progress' }).click();
  await page.getByRole('link', { name: /Personal Records See/ }).click();
  await page.getByRole('link', { name: 'Bench Press', exact: true }).click();
  await expect(page.locator('#personal-records')).toHaveAttribute('open', '');
  await page.getByRole('link', { name: 'Back to Progress' }).click();
  await page.getByRole('link', { name: /Body Measurements Track/ }).click();
  await page.getByRole('button', { name: 'Previous measurement', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next measurement', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Next measurement', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next measurement', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Dismiss measurement guidance' }).click();
  await expect(page.getByRole('heading', { name: 'Measurement units and method' })).toHaveCount(0);
  expect(errors).toEqual([]);
});
