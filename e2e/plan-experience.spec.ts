import { openSavedEditor } from './programHelpers';
import { expect, test } from '@playwright/test';

test('reference plan editor keeps weekday integrity, context, targets and overview across reloads', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.goto('/plan/new');
  await page.getByLabel('Program name').fill('Reference QA');
  await page.getByRole('button', { name: 'Add description' }).click();
  await page.getByLabel('Description or notes').fill('A real editable weekly schedule');
  await openSavedEditor(page);
  const monday = page.getByRole('article', { name: 'Monday workout day' });
  const friday = page.getByRole('article', { name: 'Friday workout day' });
  await expect(monday.getByRole('button', { name: 'Options for Monday' })).toBeVisible();
  await friday.getByRole('button', { name: 'Expand Friday' }).click();
  await expect(monday.getByRole('link', { name: 'Add Exercise to Monday' })).toHaveCount(0);
  await friday.getByRole('link', { name: 'Add Exercise to Friday' }).click();
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('Barbell Bench Press');
  await page
    .getByRole('button', { name: 'Add Barbell Bench Press to Friday', exact: true })
    .click();
  await expect(
    friday.getByRole('button', { name: 'Edit Barbell Bench Press targets' }),
  ).toBeVisible();
  await friday.getByRole('button', { name: 'Edit Barbell Bench Press targets' }).click();
  await friday.getByLabel('Minimum reps').fill('12');
  await friday.getByLabel('Maximum reps').fill('8');
  await friday.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(friday.getByRole('alert')).toContainText('Minimum target reps');
  await page.getByRole('link', { name: 'Back to Programs' }).click();
  await page.getByRole('button', { name: 'Keep Editing' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await friday.getByLabel('Maximum reps').fill('15');
  await expect(friday.getByLabel('Maximum reps')).toHaveValue('15');
  await friday.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(friday.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0);
  await friday.getByRole('button', { name: 'Options for Friday' }).click();
  await friday.getByRole('button', { name: 'Duplicate day' }).click();
  const chooser = page.getByLabel('Choose weekday');
  await expect(chooser.locator('option[value="0"]')).toHaveAttribute('disabled', '');
  await chooser.selectOption('6');
  await page.getByRole('button', { name: 'Duplicate day', exact: true }).last().click();
  const copy = page.getByRole('article', { name: 'Friday Copy workout day' });
  await expect(copy).toContainText('Sunday');
  await expect(copy).toContainText('12–15');
  await expect(page.getByText('✓ Saved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reference QA', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Training Days', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Training Days', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('article', { name: /workout day/ })).toHaveCount(4);
  for (const width of [320, 375, 390, 393, 402, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('reference-editor.png'), fullPage: true });
  await page.getByRole('link', { name: 'Back to Programs' }).click();
  await expect(page.getByRole('heading', { name: 'Plan', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Overview', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('reference-overview.png'), fullPage: true });
  await page.locator('a[href^="/workout?day="]').first().click();
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Leave workout, keep session saved' })).toBeVisible();
});
