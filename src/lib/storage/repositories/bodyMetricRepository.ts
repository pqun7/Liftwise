import type { BodyMetric } from '../../../domain/entities';
import { bodyMetricSchema } from '../../../domain/validation';
import { database, type LiftwiseDatabase } from '../database';
import { createEntityId, createTimestamp, parseMany, requireRecord } from './shared';

export interface CreateBodyMetricInput {
  waistCm?: number | null;
  chestCm?: number | null;
  armsCm?: number | null;
  legsCm?: number | null;
  measuredAt?: string;
  weight?: number | null;
  bodyFatPercentage?: number | null;
  notes?: string | null;
}

export interface UpdateBodyMetricInput {
  waistCm?: number | null;
  chestCm?: number | null;
  armsCm?: number | null;
  legsCm?: number | null;
  measuredAt?: string;
  weight?: number | null;
  bodyFatPercentage?: number | null;
  notes?: string | null;
}

export class BodyMetricRepository {
  constructor(private readonly db: LiftwiseDatabase = database) {}

  async create(input: CreateBodyMetricInput): Promise<BodyMetric> {
    const timestamp = createTimestamp();
    const metric = bodyMetricSchema.parse({
      waistCm: input.waistCm ?? null,
      chestCm: input.chestCm ?? null,
      armsCm: input.armsCm ?? null,
      legsCm: input.legsCm ?? null,
      id: createEntityId(),
      measuredAt: input.measuredAt ?? timestamp,
      weight: input.weight ?? null,
      bodyFatPercentage: input.bodyFatPercentage ?? null,
      notes: input.notes ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.db.bodyMetrics.add(metric);
    return metric;
  }

  async list(): Promise<BodyMetric[]> {
    return parseMany(
      bodyMetricSchema,
      await this.db.bodyMetrics.orderBy('measuredAt').reverse().toArray(),
    );
  }

  async update(id: string, input: UpdateBodyMetricInput): Promise<BodyMetric> {
    return this.db.transaction('rw', this.db.bodyMetrics, async () => {
      const current = requireRecord(await this.db.bodyMetrics.get(id), 'BodyMetric', id);
      const updated = bodyMetricSchema.parse({
        ...current,
        ...input,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: createTimestamp(),
      });

      await this.db.bodyMetrics.put(updated);
      return updated;
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.bodyMetrics, async () => {
      requireRecord(await this.db.bodyMetrics.get(id), 'BodyMetric', id);
      await this.db.bodyMetrics.delete(id);
    });
  }
}

export const bodyMetricRepository = new BodyMetricRepository();
