import { expect, test, type Page } from '@playwright/test';
import { setOffline } from './offline';

async function seedCompletions(page: Page, days: string[]) {
  await page.evaluate(async (dates) => {
    const request = indexedDB.open('liftwise');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Could not open fixture storage'));
    });
    const tx = db.transaction('workoutSessions', 'readwrite');
    for (const day of dates) {
      const startedAt = new Date(`${day}T08:00:00`).toISOString();
      const endedAt = new Date(`${day}T09:00:00`).toISOString();
      tx.objectStore('workoutSessions').put({
        id: crypto.randomUUID(),
        name: 'Streak fixture',
        programId: null,
        programDayId: null,
        status: 'completed',
        startedAt,
        endedAt,
        pausedAt: null,
        pausedDurationSeconds: 0,
        currentExerciseId: null,
        restStartedAt: null,
        restEndsAt: null,
        notes: null,
        createdAt: startedAt,
        updatedAt: endedAt,
      });
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Could not write fixture history'));
    });
    db.close();
  }, days);
}

async function seedSchedule(page: Page, cycle = false) {
  await page.evaluate(async (cycle) => {
    const request = indexedDB.open('liftwise');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Could not open schedule fixture storage'));
    });
    const tx = db.transaction(
      ['programs', 'programDays', 'programExercises', 'appSettings'],
      'readwrite',
    );
    const stamp = new Date('2026-09-01T10:00:00Z').toISOString();
    const programId = crypto.randomUUID();
    tx.objectStore('programs').put({
      id: programId,
      name: 'Monday Wednesday Friday',
      scheduleType: cycle ? 'cycle' : 'weekly',
      cycleStartDate: cycle ? '2026-10-05' : null,
      description: null,
      archived: false,
      draft: false,
      createdAt: stamp,
      updatedAt: stamp,
    });
    tx.objectStore('appSettings').put({
      key: 'activeProgramId',
      value: programId,
      createdAt: stamp,
      updatedAt: stamp,
    });
    for (const [order, weekday] of [0, 2, 4].entries()) {
      const dayId = crypto.randomUUID();
      tx.objectStore('programDays').put({
        id: dayId,
        programId,
        name: ['Monday', 'Wednesday', 'Friday'][order],
        order: order + 1,
        notes: null,
        weekday: cycle ? null : weekday,
        kind: cycle && order === 1 ? 'recovery' : 'workout',
        createdAt: stamp,
        updatedAt: stamp,
      });
      if (cycle && order === 1) continue;
      tx.objectStore('programExercises').put({
        id: crypto.randomUUID(),
        programDayId: dayId,
        exerciseId: crypto.randomUUID(),
        order: 1,
        targetSets: 1,
        minReps: 8,
        maxReps: 12,
        targetRirMin: 1,
        targetRirMax: 3,
        restSeconds: 60,
        notes: null,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Could not save schedule fixture'));
    });
    db.close();
  }, cycle);
}

test.describe('local calendar streak lifecycle', () => {
  test.use({ timezoneId: 'America/New_York' });

  test('cycle recovery uses one streak across headers, Progress and actual attendance calendar after reload', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.clock.install({ time: new Date('2026-10-08T12:00:00-04:00') });
    await page.goto('/progress');
    await seedSchedule(page, true);
    await seedCompletions(page, ['2026-10-05', '2026-10-07', '2026-10-07']);
    for (const route of ['/', '/plan', '/workout', '/settings', '/exercises', '/progress']) {
      await page.goto(route);
      await expect(page.getByRole('link', { name: '2 days streak', exact: true })).toHaveText(
        '2 days',
      );
      await expect(page.locator('.app-wordmark')).toHaveCount(0);
    }
    await expect(page.locator('.streak-current strong')).toHaveText('2');
    await expect(page.locator('.streak-best strong')).toHaveText('2');
    await expect(page.locator('.streak-day-completed')).toHaveCount(2);
    await expect(page.locator('.streak-day-rest')).toContainText(['Tue', 'Fri']);
    await expect(page.locator('.streak-day-connected')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.streak-current strong')).toHaveText('2');
    await page.getByRole('radio', { name: '7D', exact: true }).click();
    await expect(page.locator('.streak-current strong')).toHaveText('2');
    await page.goto('/progress/history');
    await expect(page.getByRole('link', { name: '2 days streak', exact: true })).toBeVisible();
    await seedCompletions(page, ['2026-10-08']);
    await page.goto('/progress');
    await expect(page.locator('.streak-current strong')).toHaveText('3');
    await expect(page.getByRole('link', { name: '3 days streak', exact: true })).toHaveText(
      '3 days',
    );
    await expect(page.locator('.streak-day-completed')).toHaveCount(3);
    await expect(page.locator('.streak-day-connected')).toHaveCount(1);
    await expect(page.locator('.streak-day-completed[aria-current="date"]')).toHaveAccessibleName(
      /completed, today/,
    );
  });

  test('reconstructs lifetime runs, keeps today open, and updates at local midnight', async ({
    page,
  }, testInfo) => {
    await page.clock.install({ time: new Date('2026-10-03T12:00:00-04:00') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/progress');
    await expect(page.getByRole('link', { name: 'Workout streak', exact: true })).toBeVisible();
    await expect(page.locator('.streak-day-not-tracked')).toHaveCount(5);
    await expect(page.locator('.streak-day-today')).toHaveCount(1);
    const dates = Array.from(
      { length: 18 },
      (_, index) => `2026-09-${String(9 + index).padStart(2, '0')}`,
    );
    dates.push(
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-03',
    );
    await seedCompletions(page, dates);
    await page.getByRole('radio', { name: '1M', exact: true }).click();
    await expect(page.getByRole('link', { name: '6 days streak', exact: true })).toBeVisible();
    await expect(page.locator('.streak-best strong')).toHaveText('18');
    await expect(page.locator('.streak-missed strong')).toHaveText('1');
    await expect(page.locator('.streak-day-completed')).toHaveCount(6);
    await expect(page.locator('.streak-day-future')).toHaveCount(1);
    await page.getByRole('radio', { name: '7D', exact: true }).click();
    await expect(page.locator('.streak-current strong')).toHaveText('6');
    await expect(page.locator('.streak-best strong')).toHaveText('18');
    await page.reload();
    await expect(page.locator('.streak-current strong')).toHaveText('6');
    await page.getByRole('radio', { name: '3M', exact: true }).click();
    await page.screenshot({
      path: testInfo.outputPath('streak-populated-390.png'),
      fullPage: true,
    });
    await page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Home', exact: true })
      .click();
    await expect(page.getByRole('link', { name: '6 days streak', exact: true })).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Progress', exact: true })
      .click();
    await page.clock.fastForward(12 * 60 * 60 * 1000 + 1000);
    await expect(page.locator('.streak-current strong')).toHaveText('6');
    await expect(page.locator('.streak-day-today')).toHaveCount(1);
    await expect(page.locator('.streak-missed strong')).toHaveText('1');
    await page.clock.fastForward(24 * 60 * 60 * 1000);
    await expect(page.getByRole('link', { name: 'Workout streak', exact: true })).toBeVisible();
    await expect(page.locator('.streak-current strong')).toHaveText('0');
    await expect(page.locator('.streak-best strong')).toHaveText('18');
    await expect(page.locator('.streak-missed strong')).toHaveText('2');
    await expect(page.locator('.streak-badge-copy')).toHaveText('0 days');
  });

  test('scheduled rest is blue, preserves the streak, and never counts as missed', async ({
    page,
    context,
    browserName,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.clock.install({ time: new Date('2026-10-08T12:00:00-04:00') });
    await page.goto('/progress');
    await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
    await seedSchedule(page);
    await seedCompletions(page, ['2026-10-05', '2026-10-07']);
    await page.getByRole('radio', { name: '1M', exact: true }).click();
    await expect(page.locator('.streak-current strong')).toHaveText('2');
    await expect(page.locator('.streak-best strong')).toHaveText('2');
    await expect(page.locator('.streak-missed strong')).toHaveText('0');
    await expect(page.locator('.streak-day-rest')).toHaveCount(4);
    await expect(page.locator('.streak-day-rest[aria-current="date"]')).toHaveAccessibleName(
      /Thursday.*Rest day, today/,
    );
    await expect(page.locator('.streak-legend')).toContainText('Rest');
    const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
    if (await dismiss.isVisible()) await dismiss.click();
    for (const width of [320, 360, 375, 390, 393, 402, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      for (const circle of await page.locator('.streak-day-rest .streak-day-circle svg').all()) {
        await expect(circle).toHaveCSS('color', 'rgb(160, 181, 255)');
      }
      const days = await page
        .locator('.streak-week > li')
        .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
      expect(new Set(days).size).toBe(1);
      await page.screenshot({
        path: testInfo.outputPath(`rest-blue-${width}.png`),
        fullPage: true,
      });
    }
    await page.getByRole('radio', { name: '7D', exact: true }).click();
    await expect(page.locator('.streak-current strong')).toHaveText('2');
    await expect(page.locator('.streak-best strong')).toHaveText('2');
    await page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Home', exact: true })
      .click();
    await expect(page.getByRole('link', { name: '2 days streak', exact: true })).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Progress', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('.streak-missed strong')).toHaveText('0');
    // A real completion on a rest date takes priority over the blue rest state.
    await seedCompletions(page, ['2026-10-08']);
    await page.getByRole('radio', { name: '1M', exact: true }).click();
    await expect(page.locator('.streak-current strong')).toHaveText('3');
    await expect(page.locator('.streak-day-completed[aria-current="date"]')).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await setOffline(context, browserName, true);
    if (browserName !== 'webkit') await page.reload();
    await expect(page.locator('.streak-current strong')).toHaveText('3');
    // Friday remains open; after it ends, only Friday is missed, not weekend rest.
    await page.clock.fastForward(12 * 60 * 60 * 1000 + 1000);
    await expect(page.locator('.streak-current strong')).toHaveText('3');
    await expect(page.locator('.streak-missed strong')).toHaveText('0');
    await page.clock.fastForward(24 * 60 * 60 * 1000);
    await expect(page.locator('.streak-current strong')).toHaveText('0');
    await expect(page.locator('.streak-missed strong')).toHaveText('1');
    await expect(page.locator('.streak-day-rest[aria-current="date"]')).toHaveAccessibleName(
      /Saturday.*Rest day, today/,
    );
    await page.clock.fastForward(24 * 60 * 60 * 1000);
    await expect(page.locator('.streak-missed strong')).toHaveText('1');
    await expect(page.locator('.streak-best strong')).toHaveText('3');
    await setOffline(context, browserName, false);
  });
});
