import Dexie from 'dexie';

import { LiftwiseDatabase } from '../../src/lib/storage/database';

const openDatabases: LiftwiseDatabase[] = [];
const databaseNames: string[] = [];

export function createTestDatabase(label = 'database'): LiftwiseDatabase {
  const name = `liftwise-${label}-${crypto.randomUUID()}`;
  const database = new LiftwiseDatabase(name);
  openDatabases.push(database);
  databaseNames.push(name);
  return database;
}

export function trackDatabaseName(name: string): void {
  databaseNames.push(name);
}

export async function cleanupTestDatabases(): Promise<void> {
  for (const database of openDatabases.splice(0)) {
    database.close();
  }

  await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)));
}
