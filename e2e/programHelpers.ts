import { expect, type Page } from '@playwright/test';

export async function finishBuilder(page: Page) {
  for (let day = 0; day < 30; day++) {
    const next = page.locator('.builder-footer a').last();
    await expect(next).toBeVisible();
    if ((await next.innerText()).includes('Review Program')) break;
    const href = await next.getAttribute('href');
    await next.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  }
  await page.getByRole('link', { name: 'Review Program', exact: true }).click();
  await page.getByRole('button', { name: 'Create & Activate Program' }).click();
  await expect(page).toHaveURL(/\/plan$/);
}

// Saved-program compatibility tests still exercise the existing inline editor.
// Create their data through all five real builder stages first.
export async function openSavedEditor(page: Page, choice = 'Custom', basicsSubmitted = false) {
  if (!basicsSubmitted) await page.getByRole('button', { name: 'Continue to Template' }).click();
  await page.getByRole('button', { name: new RegExp(`^${choice}`) }).click();
  await page.getByRole('button', { name: 'Next: Schedule' }).click();
  if (choice === 'Custom') {
    for (const [index, weekday] of ['Monday', 'Wednesday', 'Friday'].entries()) {
      await page
        .getByRole('button', { name: `Rename Workout Day ${index + 1}`, exact: true })
        .click();
      await page.getByRole('textbox', { name: 'Workout name' }).fill(weekday);
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  }
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await finishBuilder(page);
  await page.getByRole('radio', { name: 'Program', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Program', exact: true })).toBeChecked();
  await page.getByRole('link', { name: 'View program details' }).click();
  await page.getByRole('link', { name: 'Edit program', exact: true }).click();
}

// Create only isolated regression data through the real builder and canonical save.
export async function saveEmptyProgram(page: Page, basicsSubmitted = false) {
  await openSavedEditor(page, 'Custom', basicsSubmitted);
  for (const weekday of ['Monday', 'Wednesday', 'Friday']) {
    const day = page.getByRole('article', { name: `${weekday} workout day` });
    const expand = day.getByRole('button', { name: `Expand ${weekday}` });
    if (await expand.count()) await expand.click();
    await day.getByRole('button', { name: `Options for ${weekday}` }).click();
    await day.getByRole('button', { name: 'Delete day', exact: true }).click();
    await expect(day).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
}
