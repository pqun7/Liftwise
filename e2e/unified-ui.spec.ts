import { expect, test } from '@playwright/test';

test('Plan surfaces and page identity stay consistent across the app', async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let reference: { radius: string; background: string; border: string; font: string } | undefined;
  for (const [route, title] of [
    ['/plan', 'Plan'],
    ['/', 'Home'],
    ['/workout', 'Workout'],
    ['/progress', 'Progress'],
    ['/settings', 'More'],
    ['/exercises', 'Exercises'],
  ]) {
    await page.goto(`${route}?app=1`);
    await expect(page.locator('main > h1')).toHaveText(title!);
    const card = page.locator('main .ui-card:not(.ui-card-subtle)').first();
    await expect(card).toBeVisible();
    const appearance = await card.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        radius: style.borderRadius,
        background: style.backgroundImage,
        border: style.borderTopColor,
        font: style.fontFamily,
      };
    });
    reference ??= appearance;
    expect(appearance).toEqual(reference);
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const nav = page.getByRole('navigation', { name: 'Primary navigation' });
      await expect(nav).toBeVisible();
      for (const link of await nav.getByRole('link').all()) {
        const box = await link.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: info.outputPath(`${title}.png`), fullPage: true });
  }
  await page.goto('/progress?app=1');
  await page.getByRole('radio', { name: '3M', exact: true }).click();
  await expect(page.getByRole('radio', { name: '3M', exact: true })).toBeChecked();
  await expect(page.locator('.ui-segment:has(input:checked)')).toHaveCSS(
    'border-top-color',
    'rgb(56, 232, 183)',
  );
  expect(errors).toEqual([]);
});
