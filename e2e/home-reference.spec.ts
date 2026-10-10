import { expect, test } from '@playwright/test';

test('reference header and home cards fit iPhone widths with accessible touch targets', async ({
  page,
}, testInfo) => {
  await page.goto('/?app=1');
  await expect(page.getByRole('heading', { name: 'Liftwise', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recovery Day', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible();
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
  for (const width of [320, 375, 390, 393, 402, 414, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const brand = await page.locator('#home-title').boundingBox();
    const actions = await page.locator('.app-header-actions').boundingBox();
    expect(brand!.x + brand!.width).toBeLessThanOrEqual(actions!.x);
    for (const target of await page
      .locator('.app-header-actions a, .calendar-day, .home-hero-actions a, .bottom-nav a')
      .all()) {
      const box = await target.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    if (width === 320) {
      const lastDay = page.locator('.calendar-day').last();
      await lastDay.click();
      await expect(lastDay).toHaveAttribute('aria-pressed', 'true');
      await page.locator('.calendar-day[aria-current="date"]').click();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.streak-badge')).toHaveText('0 days');
  await expect(page.locator('.app-brand-mark img')).toHaveJSProperty('naturalWidth', 192);
  const mark = await page.locator('.app-brand-mark').boundingBox();
  const controls = await page.locator('.app-header-actions').boundingBox();
  expect(Math.abs(mark!.y + mark!.height / 2 - controls!.y - controls!.height / 2)).toBeLessThan(1);
  const flame = await page.locator('.streak-badge svg').boundingBox();
  const streakCopy = await page.locator('.streak-badge-copy').boundingBox();
  expect(streakCopy!.x).toBeGreaterThan(flame!.x + flame!.width);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  if (await dismiss.isVisible()) await dismiss.click();
  await page.locator('.app-header').screenshot({ path: testInfo.outputPath('header-iphone.png') });
  await page.screenshot({ path: testInfo.outputPath('home-reference.png'), fullPage: true });
  await page.getByRole('link', { name: 'Open calendar' }).click();
  await expect(page).toHaveURL(/\/plan\/calendar/);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await page.getByRole('link', { name: 'Recovery Tips' }).click();
  await expect(page.getByRole('searchbox', { name: 'Search exercises' })).toHaveValue('stretch');
});
