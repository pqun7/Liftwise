import { expect, test } from '@playwright/test';

import { setOffline } from './offline';

test('existing scheduling records open on launch and remain available offline', async ({
  page,
  context,
  browserName,
}) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      /^https?:$/.test(url.protocol) &&
      url.origin !== 'http://127.0.0.1:4173' &&
      url.hostname !== 'gc.kis.v2.scr.kaspersky-labs.com'
    ) {
      external.push(request.url());
    }
  });
  await page.goto('/');
  await expect(page.locator('[data-home-state]')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  const records = await page.evaluate(async () => {
    const request = indexedDB.open('liftwise');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Could not open fixture storage'));
    });
    const tx = db.transaction(['programs', 'programDays', 'appSettings'], 'readwrite');
    const stamp = new Date().toISOString();
    const programs = (['weekly', 'cycle'] as const).map((scheduleType) => ({
      id: crypto.randomUUID(),
      name: `Existing ${scheduleType} plan`,
      description: null,
      archived: false,
      scheduleType,
      createdAt: stamp,
      updatedAt: stamp,
    }));
    const days = programs.map((program, index) => ({
      id: crypto.randomUUID(),
      programId: program.id,
      name: index === 0 ? 'Training' : 'Rest',
      kind: index === 0 ? 'workout' : 'recovery',
      order: 1,
      notes: null,
      createdAt: stamp,
      updatedAt: stamp,
    }));
    programs.forEach((program) => tx.objectStore('programs').put(program));
    days.forEach((day) => tx.objectStore('programDays').put(day));
    tx.objectStore('appSettings').put({
      key: 'activeProgramId',
      value: programs[0]!.id,
      createdAt: stamp,
      updatedAt: stamp,
    });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Could not write fixture records'));
    });
    db.close();
    return { programs, days };
  });

  // Fresh document launch reads the pre-existing records, just like the reported failure.
  await page.reload();
  await expect(page.locator('[data-home-state]')).toBeVisible();
  await expect(page.getByText('Liftwise could not open this screen')).toHaveCount(0);
  await setOffline(context, browserName, true);
  try {
    if (browserName !== 'webkit') await page.reload();
    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    for (const program of records.programs) {
      await expect(page.getByText(program.name, { exact: true }).first()).toBeVisible();
    }
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page.locator('[data-home-state]')).toBeVisible();
    const persisted = await page.evaluate(async () => {
      const request = indexedDB.open('liftwise');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Could not reopen fixture storage'));
      });
      const tx = db.transaction(['programs', 'programDays'], 'readonly');
      const read = (store: string) =>
        new Promise<unknown[]>((resolve, reject) => {
          const request = tx.objectStore(store).getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error('Could not read fixture records'));
        });
      const [programs, days] = await Promise.all([read('programs'), read('programDays')]);
      db.close();
      return { programs, days };
    });
    expect(persisted.programs).toEqual(expect.arrayContaining(records.programs));
    expect(persisted.days).toEqual(expect.arrayContaining(records.days));
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  } finally {
    await setOffline(context, browserName, false);
  }
});
