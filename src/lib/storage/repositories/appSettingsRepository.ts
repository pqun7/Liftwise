import type { AppSetting, JsonValue } from '../../../domain/entities';
import { appSettingSchema } from '../../../domain/validation';
import { database, type LiftwiseDatabase } from '../database';
import { createTimestamp, parseMany } from './shared';

export class AppSettingsRepository {
  constructor(private readonly db: LiftwiseDatabase = database) {}

  async get(key: string): Promise<AppSetting | undefined> {
    const setting = await this.db.appSettings.get(key);
    return setting === undefined ? undefined : appSettingSchema.parse(setting);
  }

  async list(): Promise<AppSetting[]> {
    return parseMany(appSettingSchema, await this.db.appSettings.toArray());
  }

  async set(key: string, value: JsonValue): Promise<AppSetting> {
    return this.db.transaction('rw', this.db.appSettings, async () => {
      const current = await this.db.appSettings.get(key);
      const timestamp = createTimestamp();
      const setting = appSettingSchema.parse({
        key,
        value,
        createdAt: current?.createdAt ?? timestamp,
        updatedAt: timestamp,
      });

      await this.db.appSettings.put(setting);
      return setting;
    });
  }

  async delete(key: string): Promise<void> {
    await this.db.appSettings.delete(key);
  }
}

export const appSettingsRepository = new AppSettingsRepository();
