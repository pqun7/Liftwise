import type { z } from 'zod';

import { RecordNotFoundError } from '../errors';

export function createEntityId(): string {
  return crypto.randomUUID();
}

export function createTimestamp(): string {
  return new Date().toISOString();
}

export function requireRecord<T>(record: T | undefined, entityName: string, id: string): T {
  if (record === undefined) {
    throw new RecordNotFoundError(entityName, id);
  }

  return record;
}

export function parseMany<T>(schema: z.ZodType<T>, records: unknown[]): T[] {
  return records.map((record) => schema.parse(record));
}
