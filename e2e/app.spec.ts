import { expect, test } from '@playwright/test';
import { setOffline } from './offline';
import { saveEmptyProgram } from './programHelpers';

async function dismissPwaStatus(page: import('@playwright/test').Page) {
  const dismiss = page.getByRole('button', { name: 'Dismiss' });
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
}

test('loads the application shell and navigates across features', async ({ page, browserName }) => {
  await page.goto('/');

  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toHaveCSS('clip-path', 'inset(50%)');
  if (browserName !== 'webkit') {
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveCSS('clip-path', 'none');
  }

  await expect(page.getByRole('heading', { name: 'Welcome to Liftwise' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Workout', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Start training' })).toBeVisible({
    timeout: 15_000,
  });
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

  const mediaResponse = await request.get('/repdb-media/flat/ab-wheel-rollout-start.webp');
  expect(mediaResponse.ok()).toBeTruthy();
  expect(mediaResponse.headers()['content-type']).toContain('image/webp');

  const registration = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.getRegistration().then((worker) => Boolean(worker));
  });
  expect(registration).toBe(true);

  await page.reload();
  await setOffline(context, browserName, true);

  try {
    if (browserName === 'webkit') {
      // Playwright WebKit cannot start an offline document navigation on Windows.
      // An offline in-app navigation still verifies that the cached shell remains usable.
      await page
        .getByRole('navigation', { name: 'Primary navigation' })
        .getByRole('link', { name: 'Progress', exact: true })
        .click();
    } else {
      await page.goto('/progress');
    }
    await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible({
      timeout: 15_000,
    });
  } finally {
    await setOffline(context, browserName, false);
  }
});

test('downloads the complete exercise media pack from the production build', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'Desktop Chrome', 'One full-pack download is sufficient.');
  test.setTimeout(180_000);

  await page.goto('/settings');
  const download = page.getByRole('button', { name: 'Download exercise images' });
  await expect(download).toBeEnabled({ timeout: 20_000 });
  await download.click();

  await expect(page.getByText('All exercise images are available offline.')).toBeVisible({
    timeout: 150_000,
  });
  await expect(page.getByRole('button', { name: 'Downloaded' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Clear offline exercise images' })).toBeEnabled();
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
  await setOffline(context, browserName, true);
  try {
    if (browserName === 'webkit') {
      await page.getByRole('searchbox', { name: 'Search exercises' }).fill('My Offline Press');
    } else {
      await page.goto('/exercises');
      await page.getByRole('searchbox', { name: 'Search exercises' }).fill('My Offline Press');
    }
    await expect(page.getByRole('heading', { name: 'My Offline Press' })).toBeVisible();
  } finally {
    await setOffline(context, browserName, false);
  }
});

test('builds and reloads an exact program prescription offline', async ({
  page,
  context,
  browserName,
}) => {
  test.setTimeout(90_000);
  await page.goto('/exercises/new');
  await page.getByLabel('Name').fill('Custom Cable Press');
  await page.getByLabel('Primary muscle').fill('Chest');
  await page.getByLabel('Equipment').fill('Cable');
  await dismissPwaStatus(page);
  await page.getByRole('button', { name: 'Save custom exercise' }).click();
  await expect(page.getByRole('heading', { name: 'Custom Cable Press' })).toBeVisible({
    timeout: 20_000,
  });

  await page.goto('/plan');
  await page.getByRole('link', { name: 'Create program' }).click();
  await page.getByLabel('Program name').fill('Push Pull Legs');
  await page.getByLabel('Description or notes').fill('Offline strength plan');
  await saveEmptyProgram(page);
  await expect(page.getByRole('heading', { name: 'Push Pull Legs' })).toBeVisible();
  await expect(page.getByText('Active')).toBeVisible();

  await page.getByRole('link', { name: 'Add training day' }).click();
  await page.getByLabel('Day name').fill('Push Day');
  await page.getByLabel('Day notes').fill('Chest and shoulders');
  await page.getByRole('button', { name: 'Add day' }).click();
  await expect(page.getByRole('heading', { name: 'Push Day' })).toBeVisible();

  await page.getByRole('link', { name: 'Add exercise' }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Barbell Bench Press');
  await page
    .getByRole('link', { name: /Barbell Bench Press/ })
    .first()
    .click();
  await page.getByLabel('Target sets').fill('3');
  await page.getByLabel('Minimum reps').fill('6');
  await page.getByLabel('Maximum reps').fill('8');
  await page.getByLabel('Minimum RIR').fill('1');
  await page.getByLabel('Maximum RIR').fill('2');
  await page.getByLabel('Rest duration in seconds').fill('180');
  await page.getByRole('button', { name: 'Add to day' }).click();
  await expect(page.getByText('3 sets · 6–8 reps · 1–2 RIR')).toBeVisible();
  await expect(page.getByText('3 min rest')).toBeVisible();

  await page.getByRole('link', { name: 'Add exercise' }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Custom Cable Press');
  await page.getByRole('link', { name: /Custom Cable Press/ }).click();
  await page.getByLabel('Target sets').fill('2');
  await page.getByLabel('Minimum reps').fill('10');
  await page.getByLabel('Maximum reps').fill('12');
  await page.getByLabel('Rest duration in seconds').fill('90');
  await page.getByRole('button', { name: 'Add to day' }).click();
  await page.getByRole('button', { name: 'Reorder Custom Cable Press' }).click();
  await page.getByRole('button', { name: 'Move Custom Cable Press up' }).click();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Custom Cable Press' })).toBeVisible();
  await expect(page.getByText('2 sets · 10–12 reps · 1–2 RIR')).toBeVisible();
  await expect(page.getByText('3 sets · 6–8 reps · 1–2 RIR')).toBeVisible();

  await dismissPwaStatus(page);
  await setOffline(context, browserName, true);
  try {
    if (browserName === 'webkit') {
      await page.getByRole('link', { name: /Push Pull Legs/ }).click();
      await page.getByRole('button', { name: 'Options for Push Day' }).click();
      await page.getByRole('link', { name: 'View day details' }).click();
    } else {
      await page.reload();
    }
    await expect(page.getByText('3 min rest')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Custom Cable Press' })).toBeVisible();
  } finally {
    await setOffline(context, browserName, false);
  }
});

test('backs up, deletes, restores, and verifies an exact program offline', async ({
  page,
  context,
  browserName,
}) => {
  test.setTimeout(120_000);

  await page.goto('/exercises/new');
  await page.getByLabel('Name').fill('Backup Cable Press');
  await page.getByLabel('Primary muscle').fill('Chest');
  await page.getByLabel('Equipment').fill('Cable');
  await page.getByRole('button', { name: 'Save custom exercise' }).click();
  await expect(page.getByRole('heading', { name: 'Backup Cable Press' })).toBeVisible({
    timeout: 20_000,
  });

  await page.goto('/plan');
  await page.getByRole('link', { name: 'Create program' }).click();
  await page.getByLabel('Program name').fill('Backup Push Plan');
  await saveEmptyProgram(page);
  await page.getByRole('link', { name: 'Add training day' }).click();
  await page.getByLabel('Day name').fill('Backup Push Day');
  await page.getByRole('button', { name: 'Add day' }).click();

  await page.getByRole('link', { name: 'Add exercise' }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Barbell Bench Press');
  await page
    .getByRole('link', { name: /Barbell Bench Press/ })
    .first()
    .click();
  await page.getByLabel('Target sets').fill('3');
  await page.getByLabel('Minimum reps').fill('6');
  await page.getByLabel('Maximum reps').fill('8');
  await page.getByRole('button', { name: 'Add to day' }).click();

  await page.getByRole('link', { name: 'Add exercise' }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Backup Cable Press');
  await page.getByRole('link', { name: /Backup Cable Press/ }).click();
  await page.getByLabel('Target sets').fill('2');
  await page.getByLabel('Minimum reps').fill('10');
  await page.getByLabel('Maximum reps').fill('12');
  await page.getByRole('button', { name: 'Add to day' }).click();
  await expect(page.getByText('3 sets · 6–8 reps')).toBeVisible();
  await expect(page.getByText('2 sets · 10–12 reps')).toBeVisible();

  await page.goto('/settings/data-safety');
  await expect(page.getByText('Healthy', { exact: true })).toBeVisible({ timeout: 20_000 });
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Create Backup' }).click();
  const download = await downloadEvent;
  const backupPath = await download.path();
  if (backupPath === null) throw new Error('Backup download did not produce a local file.');

  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await page.getByRole('button', { name: 'Delete My Liftwise Data' }).click();
  await expect(page.getByText(/user data was deleted/i)).toBeVisible();
  await page.getByLabel('Restore Backup').setInputFiles(backupPath);
  await expect(page.getByRole('heading', { name: 'Liftwise Backup' })).toBeVisible();
  await expect(page.getByText('Programs').locator('..').getByText('1')).toBeVisible();
  await expect(page.getByText('Prescriptions').locator('..').getByText('2')).toBeVisible();
  await page
    .getByLabel('Replace my current Liftwise user data with this validated backup.')
    .check();
  await page.getByRole('button', { name: 'Restore and Replace Current User Data' }).click();
  await expect(page.getByText('Backup restored and verified.')).toBeVisible();

  await setOffline(context, browserName, true);
  try {
    await page.getByRole('link', { name: 'Plan' }).click();
    await page.getByRole('link', { name: 'Edit Program' }).click();
    await page.getByRole('button', { name: 'Options for Backup Push Day' }).click();
    await page.getByRole('link', { name: 'View day details' }).click();
    await expect(page.getByRole('heading', { name: 'Barbell Bench Press' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Backup Cable Press' })).toBeVisible();
    await expect(page.getByText('3 sets · 6–8 reps')).toBeVisible();
    await expect(page.getByText('2 sets · 10–12 reps')).toBeVisible();
  } finally {
    await setOffline(context, browserName, false);
  }
});
