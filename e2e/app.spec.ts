import { expect, test } from '@playwright/test';

async function dismissPwaStatus(page: import('@playwright/test').Page) {
  const dismiss = page.getByRole('button', { name: 'Dismiss' });
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
}

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

test('searches, filters, opens details, and preserves a custom exercise offline', async ({
  page,
  context,
  browserName,
}) => {
  await page.goto('/exercises');
  await expect(page.getByText('601 exercises')).toBeVisible({ timeout: 20_000 });
  await dismissPwaStatus(page);

  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('bench');
  await page.getByText('Filters').click();
  await page.getByLabel('Body part').selectOption('chest');
  await page.getByLabel('Equipment').selectOption('flat_bench');
  await expect(page.getByRole('heading', { name: 'Bench Chest Stretch' })).toBeVisible();
  await dismissPwaStatus(page);
  await page.getByRole('link', { name: 'View Bench Chest Stretch' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'How to perform' })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Bench Chest Stretch illustration' }),
  ).toBeVisible();

  await page.goto('/exercises');
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('bench dips');
  await dismissPwaStatus(page);
  await page.getByRole('link', { name: 'View Bench Dips' }).press('Enter');
  await expect(page.getByRole('button', { name: 'Start' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Peak' }).click();
  await expect(page.getByRole('button', { name: 'Peak' })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/exercises/new');
  await page.getByLabel('Name').fill('My Offline Press');
  await page.getByLabel('Primary muscle').fill('Chest');
  await page.getByLabel('Secondary muscles').fill('Triceps');
  await page.getByLabel('Equipment').fill('Band');
  await page.getByLabel('Notes').fill('Created locally');
  await page.getByRole('button', { name: 'Save custom exercise' }).click();
  await expect(page.getByRole('heading', { name: 'My Offline Press' })).toBeVisible();

  await page.goto('/exercises');
  await expect(page.getByText('602 exercises')).toBeVisible();
  await context.setOffline(true);
  try {
    if (browserName === 'webkit') {
      await page.getByRole('searchbox', { name: 'Search exercises' }).fill('My Offline Press');
    } else {
      await page.goto('/exercises');
      await page.getByRole('searchbox', { name: 'Search exercises' }).fill('My Offline Press');
    }
    await expect(page.getByRole('heading', { name: 'My Offline Press' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
