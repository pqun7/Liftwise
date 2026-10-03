import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { setOffline } from './offline';
import type { Exercise } from '../src/domain/entities';

const widths = [320, 360, 375, 390, 393, 402, 430];
const exerciseName = 'Single-Arm Dumbbell Romanian Deadlift';
const secondName = 'Machine-Assisted Neutral-Grip Pull-Up';
const programName = 'Upper Body Hypertrophy Program';

async function review(page: Page, info: TestInfo, screen: string, branded = false) {
  await page.evaluate(async () => {
    await document.fonts.load('400 16px Manrope');
    await document.fonts.load('700 26px Manrope');
    await document.fonts.ready;
  });
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    const issues = await page
      .locator('main, header, nav, button, input, select, textarea, [role="timer"]')
      .evaluateAll((elements) =>
        elements
          .filter(
            (el) =>
              el.getClientRects().length && !getComputedStyle(el).fontFamily.startsWith('Manrope'),
          )
          .map((el) => el.tagName),
      );
    expect(issues, `${screen}: all visible UI inherits Manrope`).toEqual([]);
    for (const input of await page
      .locator('input:not([type=radio]):not([type=checkbox]), select, textarea')
      .all()) {
      if (await input.isVisible())
        expect(
          await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
        ).toBeGreaterThanOrEqual(16);
    }
    if (branded) {
      const logo = page.getByRole('img', { name: 'Liftwise', exact: true });
      await expect(logo).toBeVisible();
      expect(await logo.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(617);
      const box = await logo.boundingBox();
      expect(box!.width / box!.height).toBeCloseTo(617 / 230, 2);
      expect(box!.width).toBeCloseTo(104, 0);
    } else await expect(page.locator('.app-wordmark')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`${screen}-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

test.use({ timezoneId: 'Asia/Riyadh', actionTimeout: 20_000 });
test('one local font family, original wordmark, long names, stable numbers and workout flow', async ({
  page,
  context,
  browserName,
}, info) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  const fontRequests = new Set<string>();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/\.(ttf|woff2?)(\?|$)/.test(request.url())) fontRequests.add(request.url());
  });
  await page.clock.setFixedTime(new Date('2026-10-03T12:00:00+03:00'));
  await page.goto('/exercises/new');
  await page.getByLabel('Name', { exact: true }).fill(exerciseName);
  await page.getByLabel('Primary muscle').fill('Hamstrings');
  await page.getByLabel('Primary muscle').press('Enter');
  await expect(page.getByRole('heading', { name: exerciseName, exact: true })).toBeVisible();
  const exerciseId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1)!);
  const ids = await page.evaluate(
    async ({ exerciseId, secondName, programName }) => {
      const request = indexedDB.open('liftwise');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(new Error(request.error?.message ?? 'Fixture database failed'));
      });
      const tx = db.transaction(
        [
          'exercises',
          'programs',
          'programDays',
          'programExercises',
          'appSettings',
          'workoutSessions',
        ],
        'readwrite',
      );
      const stamp = new Date().toISOString(),
        programId = crypto.randomUUID(),
        dayId = crypto.randomUUID(),
        secondId = crypto.randomUUID();
      const exercises = tx.objectStore('exercises');
      const sourceRequest = exercises.get(exerciseId);
      sourceRequest.onsuccess = () => {
        const source = sourceRequest.result as Exercise;
        exercises.put({
          ...source,
          id: secondId,
          sourceId: secondId,
          name: secondName,
          localizations: { en: { ...source.localizations.en, name: secondName } },
          searchText: secondName.toLowerCase(),
        });
      };
      tx.objectStore('programs').put({
        id: programId,
        name: programName,
        description: null,
        archived: false,
        draft: false,
        createdAt: stamp,
        updatedAt: stamp,
      });
      tx.objectStore('programDays').put({
        id: dayId,
        programId,
        name: programName,
        order: 1,
        notes: null,
        weekday: (new Date().getDay() + 6) % 7,
        createdAt: stamp,
        updatedAt: stamp,
      });
      for (const [order, id] of [exerciseId, secondId].entries())
        tx.objectStore('programExercises').put({
          id: crypto.randomUUID(),
          programDayId: dayId,
          exerciseId: id,
          order: order + 1,
          targetSets: order === 0 ? 2 : 1,
          minReps: 8,
          maxReps: 12,
          targetRirMin: 1,
          targetRirMax: 3,
          restSeconds: 120,
          notes: null,
          createdAt: stamp,
          updatedAt: stamp,
        });
      tx.objectStore('appSettings').put({
        key: 'activeProgramId',
        value: programId,
        createdAt: stamp,
        updatedAt: stamp,
      });
      for (let index = 0; index < 100; index++) {
        const date = new Date();
        date.setDate(date.getDate() - index);
        date.setHours(9, 0, 0, 0);
        const startedAt = new Date(date.getTime() - 3600000).toISOString(),
          endedAt = date.toISOString();
        tx.objectStore('workoutSessions').put({
          id: crypto.randomUUID(),
          name: 'Typography fixture',
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
        tx.onerror = () => reject(new Error(tx.error?.message ?? 'Fixture transaction failed'));
      });
      db.close();
      return { programId, dayId, secondId };
    },
    { exerciseId, secondName, programName },
  );

  await page.goto('/');
  await expect(page.getByRole('link', { name: '100 days streak', exact: true })).toBeVisible();
  await review(page, info, 'home', true);
  // Compare rendered glyph widths, not just computed font-weight or ready status.
  const font = await page.evaluate(async () => {
    const weights: number[] = [];
    for (const weight of [400, 600, 700, 800]) {
      await document.fonts.load(`${weight} 40px Manrope`);
      const el = document.createElement('span');
      el.style.cssText = `display:inline-block;font: ${weight} 40px Manrope;font-synthesis:none;font-variation-settings:'wght' ${weight}`;
      el.textContent = 'Liftwise 018W';
      document.body.append(el);
      weights.push(el.getBoundingClientRect().width);
      el.remove();
    }
    const widths: number[] = [];
    for (const value of ['111', '888', '000', '999']) {
      const el = document.createElement('span');
      el.style.cssText =
        "display:inline-block;font:700 24px Manrope;font-variant-numeric:tabular-nums;font-variation-settings:'wght' 700";
      el.textContent = value;
      document.body.append(el);
      widths.push(el.getBoundingClientRect().width);
      el.remove();
    }
    return {
      weights,
      widths,
    };
  });
  expect(font.weights[0]).toBeLessThan(font.weights[1]!);
  expect(font.weights[1]).toBeLessThan(font.weights[2]!);
  expect(font.weights[2]).toBeLessThan(font.weights[3]!);
  expect(new Set(font.widths).size).toBe(1);
  expect([...fontRequests].length).toBeGreaterThanOrEqual(4);
  expect([...fontRequests].length).toBeLessThanOrEqual(5);
  expect(
    [...fontRequests].every((url) => /\/assets\/Manrope-(400|500|600|700|800)-/.test(url)),
  ).toBe(true);
  await page.goto(`/plan/${ids.programId}`);
  await expect(page.getByRole('heading', { name: 'Edit Program', exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await review(page, info, 'program');
  await page.goto(`/exercises/${exerciseId}`);
  await expect(page.getByRole('heading', { name: exerciseName, exact: true })).toBeVisible();
  await review(page, info, 'exercise-detail', true);
  await page.goto('/exercises');
  await expect(page.getByRole('searchbox', { name: 'Search exercises' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Romanian');
  await review(page, info, 'library', true);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Make Liftwise yours' })).toBeVisible();
  await review(page, info, 'settings', true);
  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
  await review(page, info, 'progress', true);
  await page.goto('/progress/measurements');
  await expect(page.getByLabel('Weight (kg)', { exact: true })).toBeVisible();
  await page.getByLabel('Weight (kg)', { exact: true }).fill('100');
  await review(page, info, 'measurements');
  await page.goto('/workout');
  await page.getByRole('button', { name: programName, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start Workout', exact: true })).toBeVisible();
  await review(page, info, 'workout-landing');
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
  const logger = page.getByRole('region', { name: 'Set logger' });
  await expect(logger).toBeVisible();
  for (const value of ['0', '1', '8', '10', '12', '22.5', '100', '999', '1234']) {
    const input = logger.getByLabel('Set 1 weight', { exact: true });
    await input.fill(value);
    await expect(input).toHaveValue(value);
    expect(await input.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  await logger.getByLabel('Set 1 weight', { exact: true }).fill('22.5');
  await logger.getByLabel('Set 1 reps', { exact: true }).fill('12');
  await logger.getByLabel('Set 1 RIR', { exact: true }).fill('2');
  await review(page, info, 'active-workout');
  await logger.getByRole('button', { name: 'Complete set', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Rest timer' })).toBeVisible();
  await review(page, info, 'rest');
  // Stress the timer's type treatment without changing the saved workout clock.
  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    for (const value of ['01:56', '59:59']) {
      expect(
        await page.getByRole('timer').evaluate((timer, value) => {
          const original = timer.textContent;
          timer.textContent = value;
          const fits = timer.getBoundingClientRect().width <= timer.parentElement!.clientWidth - 48;
          timer.textContent = original;
          return fits;
        }, value),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Start Set 2 now', exact: true }).click();
  await expect(logger).toBeVisible();
  await logger.getByLabel('Set 2 weight', { exact: true }).fill('100');
  await logger.getByLabel('Set 2 reps', { exact: true }).fill('10');
  await logger.getByLabel('Set 2 RIR', { exact: true }).fill('2');
  await logger.getByRole('button', { name: 'Complete set', exact: true }).click();
  await page.getByRole('button', { name: 'Next Exercise', exact: true }).click();
  await expect(page.getByRole('heading', { name: secondName, exact: true })).toBeVisible();
  await logger.getByLabel('Set 1 weight', { exact: true }).fill('20');
  await logger.getByLabel('Set 1 reps', { exact: true }).fill('8');
  await logger.getByLabel('Set 1 RIR', { exact: true }).fill('2');
  await logger.getByRole('button', { name: 'Complete set', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout complete', exact: true })).toBeVisible();
  await review(page, info, 'complete');
  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  for (const title of await page
    .locator('.progress-explore-link h3, .bottom-nav a > span, .streak-stat strong')
    .all()) {
    expect(
      await title.evaluate((element) => {
        const text = document.createRange();
        text.selectNodeContents(element);
        const bounds = element.getBoundingClientRect();
        return [...text.getClientRects()].every(
          (rect) => rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1,
        );
      }),
    ).toBe(true);
  }
  await page.screenshot({ path: info.outputPath('progress-text-200-percent.png'), fullPage: true });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByRole('img', { name: 'Liftwise', exact: true })).toBeVisible();
  const logoUrl = await page.locator('.app-wordmark').getAttribute('src');
  expect(await page.evaluate(async (url) => !!(await caches.match(url!)), logoUrl)).toBe(true);
  await setOffline(context, browserName, true);
  if (browserName !== 'webkit') await page.reload();
  await expect(page.getByRole('img', { name: 'Liftwise', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.load('700 26px Manrope');
  });
  await expect(page.getByRole('link', { name: '100 days streak', exact: true })).toBeVisible();
  await setOffline(context, browserName, false);
  expect(errors).toEqual([]);
});
