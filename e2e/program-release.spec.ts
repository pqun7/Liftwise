import { finishBuilder } from './programHelpers';
import { expect, test } from '@playwright/test';

test('five-step PPL builder, seven-day guard and autosave survive reload at iPhone widths', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  page.on('dialog', (dialog) => void dialog.accept());
  await page.clock.setFixedTime(new Date(2026, 9, 5, 12));
  await page.goto('/plan');
  await page.getByRole('radio', { name: 'Program', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Build your training week' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('plan-empty.png'), fullPage: true });
  await page.getByRole('link', { name: 'Create program', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Continue to Template' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter a program name');
  const longName = 'Advanced Upper Body Hypertrophy Strength Block';
  await page.getByLabel('Program name').fill(longName);
  await page.screenshot({ path: testInfo.outputPath('basics.png'), fullPage: true });
  await page.getByRole('button', { name: 'Continue to Template' }).click();
  await expect(page.getByRole('navigation', { name: 'Program builder steps' })).toContainText(
    'Basics',
  );
  await page.getByRole('button', { name: /Push \/ Pull \/ Legs/ }).click();
  await page.getByRole('button', { name: 'Next: Schedule' }).click();
  for (const day of ['Tuesday', 'Thursday', 'Saturday']) {
    await page.getByRole('button', { name: day, exact: true }).click();
    await expect(page.getByRole('button', { name: day, exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  }
  await expect(page.locator('.schedule-summary')).toContainText('3 training days selected');
  for (const width of [320, 375, 393, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const button of await page
      .getByRole('group', { name: 'Training weekdays' })
      .getByRole('button')
      .all()) {
      const box = await button.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(32);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('schedule.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next: Exercises' }).click();
  await finishBuilder(page);
  await page.getByRole('radio', { name: 'Program', exact: true }).click();
  await page.getByRole('link', { name: 'View program details' }).click();
  await page.getByRole('link', { name: 'Edit program', exact: true }).click();
  for (const day of ['Tuesday', 'Thursday', 'Saturday', 'Sunday']) {
    await page.getByRole('button', { name: '+ Add Training Day' }).click();
    await page.getByLabel('Choose weekday').selectOption({ label: day });
    await page.getByRole('button', { name: 'Add day', exact: true }).click();
    await expect(page.getByText('✓ Saved', { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('article', { name: /workout day/ })).toHaveCount(7);
  await expect(page.getByRole('button', { name: '+ Add Training Day' })).toBeDisabled();
  await expect(page.getByText(/All 7 days are already part/)).toBeVisible();
  await page.getByRole('button', { name: /Advanced Upper Body.*7 training days/ }).click();
  await page.getByLabel('Program name', { exact: true }).fill('Push A');
  await page.getByLabel('Program name', { exact: true }).fill('Push Strength');
  await expect(page.getByText('✓ Saved', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Push Strength', exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: /workout day/ })).toHaveCount(7);
  for (const width of [320, 375, 393, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('button', { name: '+ Add Training Day' }).scrollIntoViewIfNeeded();
    const last = await page.getByRole('button', { name: '+ Add Training Day' }).boundingBox();
    const bar = await page.locator('.plan-save-bar').boundingBox();
    expect(last!.y + last!.height).toBeLessThanOrEqual(bar!.y);
    await page.screenshot({ path: testInfo.outputPath(`editor-${width}.png`), fullPage: true });
  }
  await page.goto('/workout');
  await expect(page.getByRole('heading', { name: 'Push A', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('workout.png'), fullPage: true });
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Leave workout, keep session saved' })).toBeVisible();
  await page.goto('/workout');
  await expect(page.getByRole('link', { name: 'Resume Workout' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Resume Workout' })).toBeVisible();
});
