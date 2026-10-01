import type { LiftwiseBackupData } from '../../lib/backup/backupSchema';
import { createCsv } from '../dataSafety/csv';
import { workoutElapsedSeconds } from '../../domain/workoutTime';

export function progressCsv(data: LiftwiseBackupData) {
  const sessions = [...data.workoutSessions].sort(
    (a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id),
  );
  const exercises = new Map(data.workoutExercises.map((entry) => [entry.id, entry]));
  const sets = [...data.workoutSets].sort(
    (a, b) => a.workoutExerciseId.localeCompare(b.workoutExerciseId) || a.setNumber - b.setNumber,
  );
  return {
    'workouts.csv': createCsv(
      [
        { header: 'id', value: (s) => s.id },
        { header: 'name', value: (s) => s.name },
        { header: 'status', value: (s) => s.status },
        { header: 'started_at', value: (s) => s.startedAt },
        { header: 'ended_at', value: (s) => s.endedAt },
        { header: 'duration_seconds', value: (s) => (s.endedAt ? workoutElapsedSeconds(s) : null) },
        { header: 'notes', value: (s) => s.notes },
      ],
      sessions,
    ),
    'sets.csv': createCsv(
      [
        { header: 'id', value: (s) => s.id },
        {
          header: 'workout_id',
          value: (s) => exercises.get(s.workoutExerciseId)?.workoutSessionId ?? null,
        },
        { header: 'session_exercise_id', value: (s) => s.workoutExerciseId },
        {
          header: 'exercise_id',
          value: (s) => exercises.get(s.workoutExerciseId)?.exerciseId ?? null,
        },
        {
          header: 'exercise_name_snapshot',
          value: (s) => exercises.get(s.workoutExerciseId)?.exerciseName ?? null,
        },
        { header: 'set_number', value: (s) => s.setNumber },
        { header: 'set_type', value: (s) => s.setType },
        { header: 'weight_kg', value: (s) => s.weight },
        { header: 'reps', value: (s) => s.reps },
        { header: 'rir', value: (s) => s.rir },
        { header: 'completed', value: (s) => s.completed },
      ],
      sets,
    ),
    'body_metrics.csv': createCsv(
      [
        { header: 'id', value: (m) => m.id },
        { header: 'measured_at', value: (m) => m.measuredAt },
        { header: 'weight_kg', value: (m) => m.weight },
        { header: 'body_fat_percent', value: (m) => m.bodyFatPercentage },
        { header: 'waist_cm', value: (m) => m.waistCm ?? null },
        { header: 'chest_cm', value: (m) => m.chestCm ?? null },
        { header: 'arms_cm', value: (m) => m.armsCm ?? null },
        { header: 'legs_cm', value: (m) => m.legsCm ?? null },
        { header: 'notes', value: (m) => m.notes },
      ],
      [...data.bodyMetrics].sort(
        (a, b) => a.measuredAt.localeCompare(b.measuredAt) || a.id.localeCompare(b.id),
      ),
    ),
  };
}
