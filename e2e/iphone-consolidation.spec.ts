import { expect, test, type Page } from '@playwright/test';
import { setOffline } from './offline';
import type { Program } from '../src/domain/entities';

const viewports = [
  [320, 844],
  [360, 800],
  [375, 844],
  [390, 844],
  [393, 852],
  [402, 874],
  [414, 896],
  [430, 932],
];
async function geometry(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  const outside = await page
    .locator(
      'main button, main input, main select, .app-header h1, .context-toolbar h1, .bottom-nav a, .bottom-nav span',
    )
    .evaluateAll((elements) =>
      elements
        .filter((el) => {
          const box = el.getBoundingClientRect();
          return box.width && (box.left < -1 || box.right > innerWidth + 1);
        })
        .map((el) => el.textContent || el.getAttribute('aria-label')),
    );
  expect(outside).toEqual([]);
  const main = page.locator('main');
  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect
    .poll(
      async () =>
        (await main.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))) -
        (await nav.boundingBox())!.height,
    )
    .toBeGreaterThan(0);
  // At the end of the page, the last content/action clears the fixed navigation.
  await expect(page.locator('main > section, main > article').last()).toBeVisible();
  await expect
    .poll(async () => {
      await page.evaluate(() =>
        scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
      );
      const content = await page.locator('main > section, main > article').last().boundingBox();
      return !!content && content.y + content.height <= (await nav.boundingBox())!.y + 1;
    })
    .toBe(true);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
}

test('one app header and navigation across the complete iPhone viewport matrix', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const route of ['/', '/plan', '/workout', '/progress', '/settings', '/exercises']) {
    await page.goto(route);
    await expect(page.getByRole('banner', { name: 'Liftwise application header' })).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Workout streak', exact: true })).toHaveText(
      '0 days',
    );
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width: width!, height: height! });
      await geometry(page);
    }
    await page.screenshot({
      path: info.outputPath(`${route.replaceAll('/', '') || 'home'}-430.png`),
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
  // Nonzero injected insets exercise standalone safe-area ownership in WebKit.
  await page.addStyleTag({ content: ':root { --safe-top: 47px; --safe-bottom: 34px; }' });
  await expect(page.locator('.app-header')).toHaveCSS('padding-top', '59px');
  await expect(page.locator('main')).toHaveCSS('padding-top', '12px');
  await expect(page.locator('meta[name=viewport]')).not.toHaveAttribute(
    'content',
    /maximum-scale|user-scalable\s*=\s*no/i,
  );
});

test('Recovery Day fits and schedule controls, long titles and builder actions stay accessible', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  await page.goto('/plan/new');
  await page
    .getByLabel('Program name')
    .fill('A long translated strength and conditioning program title for mobile training');
  await page.getByRole('radio', { name: /Flexible Cycle/ }).check();
  await page.getByRole('button', { name: 'Continue to Template' }).click();
  await page.getByRole('button', { name: /^Custom/ }).click();
  await page.getByRole('button', { name: 'Next: Schedule' }).click();
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Add Workout Day' }).click();
  await page.getByRole('button', { name: 'Add Recovery Day' }).click();
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  for (let i = 0; i < 5; i++) {
    await page.getByRole('link', { name: 'Next day', exact: true }).click();
    await expect(page.locator('.exercise-day-navigation')).toContainText(`Day ${i + 2} of 6`);
  }
  await expect(page.getByRole('heading', { name: 'Take the day off' })).toBeVisible();
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
  const recoveryUrl = page.url();
  await page.addStyleTag({ content: ':root { --safe-top: 47px; --safe-bottom: 34px; }' });
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width: width!, height: height! });
    await geometry(page);
    if (width === 375 || width === 390) {
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
        height!,
      );
      const action = await page
        .getByRole('link', { name: 'Review Program', exact: true })
        .boundingBox();
      expect(action!.y + action!.height).toBeLessThan(
        (await page.locator('.bottom-nav').boundingBox())!.y,
      );
      await page.screenshot({ path: info.outputPath(`recovery-${width}.png`), fullPage: true });
    }
  }
  // Promote only this isolated fixture so the existing schedule route loads it.
  await page.evaluate(async () => {
    const request = indexedDB.open('liftwise');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Fixture database unavailable'));
    });
    const tx = db.transaction(['programs', 'appSettings'], 'readwrite');
    const programs = tx.objectStore('programs');
    const all = programs.getAll();
    all.onsuccess = () => {
      const program = (all.result as Program[])[0]!;
      programs.put({ ...program, draft: false });
      const stamp = new Date().toISOString();
      tx.objectStore('appSettings').put({
        key: 'activeProgramId',
        value: program.id,
        createdAt: stamp,
        updatedAt: stamp,
      });
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Fixture transaction failed'));
    });
    db.close();
  });
  await page.goto('/plan/schedule');
  await expect(page.getByLabel('Cycle start date')).toBeVisible();
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width: width!, height: height! });
    await geometry(page);
    const input = page.getByLabel('Cycle start date');
    expect(
      await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(16);
    expect(await input.evaluate((el) => el.closest('label')?.textContent)).toContain(
      'Cycle start date',
    );
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({ content: ':root { font-size: 150%; }' });
  await geometry(page);
  await page.getByLabel('Cycle start date').focus();
  // Chromium's native date input has separate keyboard stops for its date segments.
  for (let stop = 0; stop < 5; stop++) {
    await page.keyboard.press('Tab');
    if (
      await page
        .getByRole('button', { name: 'Save Schedule' })
        .evaluate((el) => el === document.activeElement)
    )
      break;
  }
  await expect(page.getByRole('button', { name: 'Save Schedule' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Save Schedule' })).toHaveCSS(
    'outline-style',
    'solid',
  );
  await expect(page.getByRole('button', { name: 'Save Schedule' })).toHaveCSS(
    'transition-duration',
    '0s',
  );
  await page.setViewportSize({ width: 390, height: 450 });
  await page.getByLabel('Cycle start date').focus();
  await geometry(page);
  await page.goto(recoveryUrl);
  await expect(page.getByRole('link', { name: 'Review Program', exact: true })).toBeVisible();
});

test('shared shell remains available offline with the existing standalone manifest', async ({
  page,
  context,
  browserName,
}) => {
  await page.goto('/settings');
  await expect(page.locator('.app-header')).toBeVisible();
  const manifest: unknown = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ id: '/', start_url: '/', scope: '/', display: 'standalone' });
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await setOffline(context, browserName, true);
  for (const [route, path, title] of [
    ['Home', '/', 'Welcome to Liftwise'],
    ['Plan', '/plan', 'Plan'],
    ['Workout', '/workout', 'Start training'],
    ['Progress', '/progress', 'Progress'],
    ['More', '/settings', 'Make Liftwise yours'],
  ] as const) {
    await page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: route, exact: true })
      .click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(path);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Workout streak', exact: true })).toHaveText(
      '0 days',
    );
  }
  await setOffline(context, browserName, false);
});
