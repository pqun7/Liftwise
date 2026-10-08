import { expect, type Page } from '@playwright/test';

export async function finishBuilder(page: Page) {
  for (let day = 0; day < 30; day++) {
    const next = page.locator('.builder-footer a').last();
    await expect(next).toBeVisible();
    if ((await next.innerText()).includes('Review Program')) break;
    const href = await next.getAttribute('href');
    await next.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator('.builder-footer a').last()).not.toHaveAttribute('href', href!);
  }
  await page.getByRole('link', { name: 'Review Program', exact: true }).click();
  await page.getByRole('button', { name: 'Create & Activate Program' }).click();
  await expect(page).toHaveURL(/\/plan$/);
}

// Saved-program compatibility tests still exercise the existing inline editor.
// Create their data through all five real builder stages first.
export async function openSavedEditor(page: Page, choice = 'Custom', basicsSubmitted = false) {
  if (!basicsSubmitted) {
    await page.getByRole('radio', { name: /Weekly Schedule/ }).check();
    await page.getByRole('button', { name: 'Continue to Template' }).click();
  }
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
  await expect(page).toHaveURL(/\/plan\/[^/?]+$/);
  await expect(page.getByRole('heading', { name: 'Program details', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Edit program', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
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
export async function openWorkoutDay(page: Page, name: string) {
  const dayId = await page.evaluate(async (dayName) => {
    const request = indexedDB.open('liftwise');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Fixture database unavailable'));
    });
    const days = await new Promise<Array<{ id: string; name: string }>>((resolve, reject) => {
      const read = db.transaction('programDays').objectStore('programDays').getAll();
      read.onsuccess = () => resolve(read.result as Array<{ id: string; name: string }>);
      read.onerror = () => reject(read.error ?? new Error('Fixture days unavailable'));
    });
    db.close();
    return days.find((day) => day.name === dayName)?.id;
  }, name);
  expect(dayId).toBeTruthy();
  // Change the client route without issuing an offline document request. This
  // exercises the same public day query used by Plan and the workout loader.
  await page.evaluate((url) => {
    history.pushState(null, '', url);
    dispatchEvent(new PopStateEvent('popstate'));
  }, `/workout?day=${dayId!}`);
  await expect(page.getByRole('button', { name: 'Start Workout', exact: true })).toBeVisible();
}
