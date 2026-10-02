import { expect, type Page } from '@playwright/test';

// Existing regression fixtures need an empty saved program before exercising legacy day CRUD.
// Use the real guided UI, then remove only the new empty fixture day in this isolated test context.
export async function saveEmptyProgram(page: Page, basicsSubmitted = false) {
  if (!basicsSubmitted)
    await page.getByRole('button', { name: 'Next: Choose Days' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Training Days', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: /Custom/ }).check();
  await page.getByRole('button', { name: 'Wednesday', exact: true }).click();
  await page.getByRole('button', { name: 'Friday', exact: true }).click();
  await page.getByRole('button', { name: 'Next: Add Exercises' }).click();
  await page.getByRole('link', { name: 'Next: Review' }).click();
  await page.getByRole('button', { name: 'Save Program', exact: true }).click();
  const day = page.locator('.day-card').filter({ hasText: 'Training Day 1' });
  page.once('dialog', (dialog) => dialog.accept());
  await day.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(day).toHaveCount(0);
}
