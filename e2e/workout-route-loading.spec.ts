import { expect, test } from '@playwright/test';
import { openLegacyUnplannedFixture } from './workoutUi';

// Test the route's network boundary independently from service-worker precaching.
test.use({ serviceWorkers: 'block' });

test('opens and resumes a saved workout when deferred logger downloads are unavailable', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/workout');
  await expect(page.getByRole('heading', { name: 'Start training' })).toBeVisible();
  const sourceModule = /\/src\/features\/workout\/WorkoutSessionPage\.tsx(?:\?.*)?$/;
  await context.route(sourceModule, (route) => route.abort('failed'));
  await context.route(/\/assets\/WorkoutSessionPage-[^/]+\.js(?:\?.*)?$/, (route) =>
    route.abort('failed'),
  );
  await openLegacyUnplannedFixture(page);
  await expect(
    page.getByRole('heading', { name: 'Legacy unplanned workout', exact: true }),
  ).toBeVisible();
  const sessionUrl = page.url();
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Home', exact: true })
    .click();
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Workout', exact: true })
    .click();
  await page.getByRole('link', { name: 'Resume Workout', exact: true }).click();
  await expect(page).toHaveURL(sessionUrl);
  await expect(
    page.getByRole('heading', { name: 'Legacy unplanned workout', exact: true }),
  ).toBeVisible();
  // Dev reload must fetch initial source modules again; production logger chunks stay blocked.
  await context.unroute(sourceModule);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Legacy unplanned workout', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
