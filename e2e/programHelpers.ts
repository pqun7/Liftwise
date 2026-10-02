import { expect, type Page } from '@playwright/test';

// Create only isolated regression data through the real builder.
export async function saveEmptyProgram(page: Page, basicsSubmitted = false) {
  if (!basicsSubmitted) await page.getByRole('button', { name: 'Next: Choose Days' }).click();
  await expect(page.getByRole('heading', { name: 'Training Days', exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('button', { name: 'Custom · Build your own schedule' }).click();
  await page.getByRole('button', { name: 'Wednesday', exact: true }).click();
  await page.getByRole('button', { name: 'Friday', exact: true }).click();
  await page.getByRole('button', { name: 'Next: Add Exercises' }).click();
  await page.getByRole('button', { name: 'Save Program', exact: true }).click();
  const day = page.getByRole('article', { name: 'Monday workout day' });
  await day.getByRole('button', { name: 'Options for Monday' }).click();
  await day.getByRole('button', { name: 'Delete day', exact: true }).click();
  await expect(day).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
}
