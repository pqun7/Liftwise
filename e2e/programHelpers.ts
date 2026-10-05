import { expect, type Page } from '@playwright/test';

// Create only isolated regression data through the real builder.
export async function saveEmptyProgram(page: Page, basicsSubmitted = false) {
  if (!basicsSubmitted) await page.getByRole('button', { name: 'Next: Schedule' }).click();
  await expect(page.getByRole('heading', { name: 'Schedule', exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('button', { name: 'Custom Schedule' }).click();
  await page.getByRole('button', { name: 'Wednesday', exact: true }).click();
  await page.getByRole('button', { name: 'Friday', exact: true }).click();
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await page.getByRole('button', { name: 'Next: Review', exact: true }).click();
  await page.getByRole('button', { name: 'Save Program', exact: true }).click();
  const day = page.getByRole('article', { name: 'Monday workout day' });
  await day.getByRole('button', { name: 'Options for Monday' }).click();
  await day.getByRole('button', { name: 'Delete day', exact: true }).click();
  await expect(day).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
}
