import { expect, test } from '@playwright/test';

test('loads the application shell and navigates across features', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Welcome to Liftwise' })).toBeVisible();
  await page.getByRole('link', { name: 'Workout' }).click();
  await expect(page.getByRole('heading', { name: 'Train without distraction' })).toBeVisible();
  await expect(page).toHaveURL(/\/workout$/);
});

test('installs its app shell and serves routes offline', async ({
  page,
  request,
  context,
  browserName,
}) => {
  await page.goto('/');

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();

  const manifestResponse = await request.get(manifestHref ?? '/manifest.webmanifest');
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = (await manifestResponse.json()) as {
    display?: string;
    icons?: { sizes?: string }[];
  };
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons?.map((icon) => icon.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );

  const registration = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.getRegistration().then((worker) => Boolean(worker));
  });
  expect(registration).toBe(true);

  await page.reload();
  await context.setOffline(true);

  try {
    if (browserName === 'webkit') {
      // Playwright WebKit cannot start an offline document navigation on Windows.
      // An offline in-app navigation still verifies that the cached shell remains usable.
      await page.getByRole('link', { name: 'Progress' }).click();
    } else {
      await page.goto('/progress');
    }
    await expect(page.getByRole('heading', { name: 'See the work add up' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
