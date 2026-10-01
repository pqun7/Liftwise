import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';

export const appSettingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  updatedAt: z.string().datetime(),
});

export type AppSetting = z.infer<typeof appSettingSchema>;

export class LiftwiseDatabase extends Dexie {
  appSettings!: EntityTable<AppSetting, 'key'>;

  constructor(name = 'liftwise') {
    super(name);

    this.version(1).stores({
      appSettings: '&key, updatedAt',
    });
  }
}

export const database = new LiftwiseDatabase();

export async function saveAppSetting(setting: AppSetting): Promise<void> {
  const validatedSetting = appSettingSchema.parse(setting);

  await database.transaction('rw', database.appSettings, async () => {
    await database.appSettings.put(validatedSetting);
  });
}
