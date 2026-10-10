import { expect, test } from '@playwright/test';

test('guide matches the reference structure and opens the real application', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your training.One tap away.');
  await expect(page.locator('ol > li')).toHaveCount(4);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(() =>
      page
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  expect(
    await page
      .locator('img')
      .evaluateAll((images) =>
        images.every(
          (image) =>
            image instanceof HTMLImageElement &&
            image.naturalWidth >= image.getBoundingClientRect().width * 2,
        ),
      ),
    'Screenshots must have enough source pixels for at least 2x display density',
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `output/installation-${test.info().project.name.replaceAll(' ', '-')}.png`,
    fullPage: true,
  });
  for (const width of [320, 768, 850]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.getByRole('link', { name: 'Open Liftwise' }).click();
  await expect(page.locator('[data-home-state]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ready in 4 simple steps' })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-home-state]')).toBeVisible();
  await page.goto('/');
  await expect(page.locator('[data-home-state]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('installed iPhone always bypasses the guide, even on its explicit URL', async ({ page }) => {
  const requestedAssets: string[] = [];
  page.on('request', (request) => requestedAssets.push(request.url()));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
  });
  await page.goto('/install');
  await expect(page.locator('[data-home-state]')).toBeVisible();
  await expect(page).toHaveURL(/\/\?app=1/);
  await expect(page.getByRole('heading', { name: 'Ready in 4 simple steps' })).toHaveCount(0);
  expect(requestedAssets.some((url) => url.includes('/installation/'))).toBe(false);
});

test('desktop and iPhone layouts keep content readable and correctly ordered', async ({ page }) => {
  await page.goto('/install');
  await expect(page.locator('.installation-container')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => {
      const bounds = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing layout element: ${selector}`);
        const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
        return { x, y, width, height, right, bottom };
      };
      return {
        viewport: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        container: bounds('.installation-container'),
        title: bounds('#installation-title'),
        phone: bounds('.installation-phone'),
        button: bounds('a[href="/?app=1"].font-extrabold'),
        steps: Array.from(document.querySelectorAll('.installation-step')).map((step) => {
          const { x, y, right } = step.getBoundingClientRect();
          return { x, y, right };
        }),
      };
    });
    expect(layout.scrollWidth, `overflow at ${width}px`).toBeLessThanOrEqual(width);
    expect(layout.container.width).toBeLessThanOrEqual(1200);
    expect(layout.title.x).toBeGreaterThanOrEqual(0);
    expect(layout.title.right).toBeLessThanOrEqual(width);
    expect(layout.button.height).toBeGreaterThanOrEqual(58);
    expect(layout.phone.width).toBeLessThanOrEqual(354);
    if (width >= 768) {
      expect(layout.phone.x).toBeGreaterThanOrEqual(layout.title.right);
      expect(Math.abs(layout.steps[0]!.y - layout.steps[1]!.y)).toBeLessThan(1);
      expect(layout.steps[1]!.x).toBeGreaterThan(layout.steps[0]!.right);
    } else {
      expect(layout.phone.y).toBeGreaterThan(layout.button.bottom);
      expect(layout.steps[1]!.y).toBeGreaterThan(layout.steps[0]!.y);
    }
    if (width === 390 || width === 1440) {
      for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `output/installation-responsive-${width}-${test.info().project.name.replaceAll(' ', '-')}.png`,
        fullPage: true,
      });
    }
  }
});

test('standalone display mode bypasses the guide on the original root shortcut', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const result = originalMatchMedia(query);
      if (query === '(display-mode: standalone)') {
        Object.defineProperty(result, 'matches', { value: true });
      }
      return result;
    };
  });
  await page.goto('/');
  await expect(page.locator('[data-home-state]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ready in 4 simple steps' })).toHaveCount(0);
});
