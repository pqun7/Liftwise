import { expect, type Page } from '@playwright/test';

export async function finishLogger(page: Page) {
  const menu = page
    .locator('details')
    .filter({ has: page.getByLabel('Workout menu', { exact: true }) });
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await page.getByLabel('Workout menu', { exact: true }).click();
  }
  await menu.getByRole('button', { name: 'Finish Workout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Start training' })).toBeVisible();
}
