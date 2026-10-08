import { expect, test } from '@playwright/test';

test('shared controls and navigation stay coherent at mobile widths', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const screens = [
    { route: '/', action: 'Create Program', role: 'link' as const },
    { route: '/plan/new', action: 'Continue to Template', role: 'button' as const },
    { route: '/workout', action: 'Create Program', role: 'link' as const },
    { route: '/progress/measurements', action: 'Add measurement', role: 'button' as const },
  ];
  for (const { route, action, role } of screens) {
    await page.goto(route);
    const primary = page.getByRole(role, { name: action, exact: role === 'link' });
    await expect(primary).toBeVisible();
    await expect(primary).toHaveCSS(
      'background-color',
      route === '/' ? 'rgb(4, 34, 27)' : 'rgb(56, 232, 183)',
    );
    const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(navigation).toHaveCount(1);
    await expect(navigation).toHaveCSS('position', 'fixed');
    await expect(navigation).toHaveCSS('bottom', '0px');
    for (const width of [320, 375, 390, 393, 402, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      for (const link of await page.locator('.bottom-nav a').all()) {
        const box = await link.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    }
    for (const input of await page
      .locator('input:not([type=radio]):not([type=checkbox]):not([type=file]), textarea, select')
      .all()) {
      if (await input.isVisible()) {
        expect(
          await input.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
        ).toBeGreaterThanOrEqual(16);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: testInfo.outputPath(`shared-${route.replaceAll('/', '') || 'home'}.png`),
      fullPage: true,
    });
  }
  await expect(page.locator('meta[name=viewport]')).not.toHaveAttribute(
    'content',
    /maximum-scale|user-scalable\s*=\s*no/i,
  );
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await expect
    .poll(() =>
      page.evaluate(async () => {
        for (const name of await caches.keys()) {
          if (
            (await (await caches.open(name)).keys()).filter((request) =>
              /\/Manrope-(400|500|600|700|800)-[^/]+\.woff2$/.test(new URL(request.url).pathname),
            ).length === 5
          )
            return true;
        }
        return false;
      }),
    )
    .toBe(true);
});
