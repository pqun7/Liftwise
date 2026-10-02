import { openLegacyUnplannedFixture } from './workoutUi';
import { finishLogger } from './workoutUi';
import { expect, test, type Page } from '@playwright/test';
import { setOffline } from './offline';
import { saveEmptyProgram } from './programHelpers';

async function dismissStatus(page: Page) {
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
}

async function auditLayout(page: Page, mobile = true) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const controls = page.locator(
    'input:not([type=checkbox]):not([type=file]):not([type=hidden]), textarea, select',
  );
  for (const control of await controls.all()) {
    if (!(await control.isVisible())) continue;
    if (mobile)
      await expect
        .poll(() => control.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)))
        .toBeGreaterThanOrEqual(16);
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
  }
}

test('compact forms retain zoom, safe spacing, large text and keyboard focus', async ({
  page,
  browserName,
}) => {
  test.setTimeout(90_000);
  await page.goto('/plan/new');
  await expect(page.getByLabel('Program name')).toBeVisible();
  await expect(page.getByText('Liftwise is ready offline.')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.update-prompt')).toHaveCSS('position', 'static');
  const status = await page.locator('.update-prompt').boundingBox();
  const name = await page.getByLabel('Program name').boundingBox();
  expect(name!.y).toBeGreaterThanOrEqual(status!.y + status!.height);
  await dismissStatus(page);
  const viewport = await page.locator('meta[name=viewport]').getAttribute('content');
  expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)|maximum-scale\s*=/i);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 375, 390, 393, 414, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await auditLayout(page);
    await page.getByLabel('Program name').focus();
    expect(
      await page
        .getByLabel('Program name')
        .evaluate((element) => getComputedStyle(element).outlineStyle),
    ).not.toBe('none');
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
    document.documentElement.style.setProperty('--safe-top', '44px');
    document.documentElement.style.setProperty('--safe-bottom', '34px');
  });
  await auditLayout(page);
  expect(
    await page
      .locator('.bottom-nav')
      .evaluate((element) => parseFloat(getComputedStyle(element).paddingBottom)),
  ).toBeGreaterThanOrEqual(34);
  expect(
    await page
      .locator('.main-content')
      .evaluate((element) => parseFloat(getComputedStyle(element).paddingTop)),
  ).toBeGreaterThanOrEqual(44);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await auditLayout(page, browserName === 'webkit');
});

test('all core training, charts, backup and CSV flows work with network disabled', async ({
  page,
  context,
  browserName,
}) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 390, height: 844 });
  page.setDefaultTimeout(15_000);
  const timings: Record<string, number> = {};
  const external: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) {
      const url = new URL(request.url());
      // This Windows host injects Kaspersky scripts into browser pages; not Liftwise assets.
      if (url.hostname === 'gc.kis.v2.scr.kaspersky-labs.com') return;
      if (url.origin !== 'http://127.0.0.1:4173') external.push(request.url());
    }
  });
  let started = Date.now();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Welcome to Liftwise/i })).toBeVisible();
  timings.launch = Date.now() - started;
  await page
    .getByRole('link', { name: /Exercise Library/i })
    .first()
    .click();
  await expect(page.getByText('601 exercises')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  // Home now has a local-data loader: wait for navigation before reloading the document.
  await expect(page.getByRole('heading', { name: /Welcome to Liftwise/i })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect(page.getByRole('heading', { name: /Welcome to Liftwise/i })).toBeVisible();
  await dismissStatus(page);
  await setOffline(context, browserName, true);
  try {
    if (browserName !== 'webkit') {
      await page.reload();
      await expect(page.getByRole('heading', { name: /Welcome to Liftwise/i })).toBeVisible();
    }
    started = Date.now();
    await page
      .getByRole('link', { name: /Exercise Library/i })
      .first()
      .click();
    await expect(page.getByText('601 exercises')).toBeVisible({ timeout: 20_000 });
    timings.library = Date.now() - started;
    await page.getByRole('searchbox', { name: 'Search exercises' }).fill('bench');
    await expect(
      page.getByRole('heading', { name: 'Barbell Bench Press', exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    started = Date.now();
    await page.getByRole('link', { name: 'Create program' }).click();
    await expect(page.getByLabel('Program name')).toBeVisible();
    timings.program = Date.now() - started;
    await page.getByLabel('Program name').fill('Offline QA');
    await saveEmptyProgram(page);
    await page.getByRole('link', { name: 'Add training day' }).click();
    await page.getByLabel('Day name').fill('Offline Push');
    await page.getByRole('button', { name: 'Add day' }).press('Enter');
    await page.getByRole('link', { name: 'Add exercise', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Barbell Bench Press');
    await page
      .getByRole('link', { name: /Barbell Bench Press/ })
      .first()
      .click();
    await page.getByLabel('Target sets').fill('3');
    await page.getByLabel('Rest duration in seconds').fill('60');
    await page.getByRole('button', { name: 'Add to day' }).press('Enter');
    await page.getByRole('link', { name: 'Workout', exact: true }).click();
    started = Date.now();
    await page.getByRole('button', { name: /Offline Push/ }).click();
    await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
    await expect(page.getByLabel('Set 1 weight', { exact: true })).toBeVisible();
    timings.workout = Date.now() - started;
    await page.getByLabel('Workout menu', { exact: true }).click();
    await page.getByLabel('Keep screen awake while training').check();
    await page.getByLabel('Workout menu', { exact: true }).click();
    for (const number of [1, 2]) {
      await page.getByLabel(`Set ${number} weight`, { exact: true }).fill('100');
      await page.getByLabel(`Set ${number} reps`, { exact: true }).fill('8');
      await page.getByRole('button', { name: 'Complete set', exact: true }).first().click();
      await expect(page.getByRole('button', { name: 'Completed', exact: true })).toHaveCount(
        number,
      );
    }
    await expect(page.getByRole('button', { name: 'Completed', exact: true })).toHaveCount(2);
    const current = await page.getByRole('region', { name: 'Set logger' }).boundingBox();
    const undo = await page.getByRole('status').filter({ hasText: 'Set saved' }).boundingBox();
    expect(undo!.y).toBeGreaterThanOrEqual(current!.y + current!.height);
    await auditLayout(page);
    if (browserName === 'webkit') {
      for (const width of [320, 375, 390, 393, 414, 430]) {
        await page.setViewportSize({ width, height: 844 });
        await auditLayout(page);
      }
    }
    await page.getByLabel('Workout menu', { exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.getByLabel('Workout menu', { exact: true }).click();
    if (browserName !== 'webkit') await page.reload();
    else {
      await page.getByRole('link', { name: 'Leave workout, keep session saved' }).click();
      await expect(page.locator('[data-home-state=in-progress]')).toBeVisible();
      await page.getByRole('link', { name: 'Continue Workout', exact: true }).click();
    }
    await expect(page.getByRole('button', { name: 'Completed', exact: true })).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Skip Rest Timer' })).toBeVisible();
    await page.getByLabel('Workout menu', { exact: true }).click();
    await expect(page.getByLabel('Keep screen awake while training')).toBeChecked();
    await page.getByLabel('Workout menu', { exact: true }).click();
    await finishLogger(page);
    await openLegacyUnplannedFixture(page);
    await page.getByRole('link', { name: 'Add Exercise', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Barbell Bench Press');
    await page
      .getByRole('button', { name: /Barbell Bench Press/ })
      .first()
      .click();
    await expect(page.getByText(/100.*8/).first()).toBeVisible();
    await page.getByLabel('Set 1 weight', { exact: true }).fill('102.5');
    await page.getByLabel('Set 1 reps', { exact: true }).fill('8');
    await page.getByRole('button', { name: 'Complete set', exact: true }).first().click();
    await finishLogger(page);
    started = Date.now();
    await page.getByRole('link', { name: 'Progress', exact: true }).click();
    await expect(page.getByText('2 completed workouts · 3 working sets')).toBeVisible();
    timings.history = Date.now() - started;
    for (const filename of ['workouts.csv', 'sets.csv', 'body_metrics.csv']) {
      const event = page.waitForEvent('download');
      await page.getByRole('button', { name: `Export ${filename}` }).click();
      expect((await event).suggestedFilename()).toBe(filename);
    }
    started = Date.now();
    await page.getByRole('link', { name: 'Barbell Bench Press', exact: true }).click();
    await expect(page.locator('.recharts-surface')).toBeVisible();
    timings.chart = Date.now() - started;
    await page.getByRole('link', { name: 'More', exact: true }).click();
    await page.getByRole('link', { name: 'Open Data Safety' }).click();
    await expect(page.getByText('Healthy', { exact: true })).toBeVisible();
    await auditLayout(page);
    const event = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Create Backup' }).click();
    const backupPath = await (await event).path();
    if (!backupPath) throw new Error('Backup file missing');
    // Playwright owns this isolated context: never run deletion against a user's profile.
    await page.getByLabel('Type DELETE to confirm').fill('DELETE');
    await page.getByRole('button', { name: 'Delete My Liftwise Data' }).click();
    await expect(page.getByText(/user data was deleted/i)).toBeVisible();
    await page.getByRole('link', { name: 'Progress', exact: true }).click();
    await expect(page.getByText('0 completed workouts · 0 working sets')).toBeVisible();
    await page.getByRole('link', { name: 'More', exact: true }).click();
    await page.getByRole('link', { name: 'Open Data Safety' }).click();
    await page.getByLabel('Restore Backup').setInputFiles(backupPath);
    await expect(page.getByRole('heading', { name: 'Liftwise Backup' })).toBeVisible();
    await auditLayout(page);
    await page
      .getByLabel('Replace my current Liftwise user data with this validated backup.')
      .check();
    await page.getByRole('button', { name: 'Restore and Replace Current User Data' }).click();
    await expect(page.getByText('Backup restored and verified.')).toBeVisible();
    await page.getByRole('link', { name: 'Progress', exact: true }).click();
    await expect(page.getByText('2 completed workouts · 3 working sets')).toBeVisible();
    await page
      .getByRole('region', { name: 'Workout history' })
      .getByRole('link', { name: /Offline Push/ })
      .click();
    await expect(page.getByText('3 sets · 6–8 reps · 1–2 RIR')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Completed', exact: true })).toHaveCount(2);
    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Offline QA', exact: true })).toBeVisible();
    expect(external).toEqual([]);
    await page.getByRole('link', { name: 'Workout', exact: true }).click();
    await openLegacyUnplannedFixture(page);
    await expect(page.getByLabel('Keep screen awake while training')).toBeChecked();
    const storage = await page.evaluate(
      async () => navigator.storage?.estimate?.().catch(() => null) ?? null,
    );
    console.log(`Local preview ${browserName} storage estimate: ${JSON.stringify(storage)}`);
    console.log(
      `Local preview ${browserName} first-visible milliseconds: ${JSON.stringify(timings)}`,
    );
  } finally {
    await setOffline(context, browserName, false).catch(() => undefined);
  }
});
