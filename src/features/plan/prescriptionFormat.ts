import type { ProgramExercise } from '../../domain/entities';

function range(minimum: number | null, maximum: number | null, suffix: string): string {
  if (minimum === null && maximum === null) return `No ${suffix} target`;
  if (minimum === maximum || maximum === null) return `${minimum ?? maximum} ${suffix}`;
  if (minimum === null) return `Up to ${maximum} ${suffix}`;
  return `${minimum}–${maximum} ${suffix}`;
}

export function formatPrescription(prescription: ProgramExercise): string {
  const sets =
    prescription.targetSets === null ? 'No set target' : `${prescription.targetSets} sets`;
  return `${sets} · ${range(prescription.minReps, prescription.maxReps, 'reps')} · ${range(prescription.targetRirMin, prescription.targetRirMax, 'RIR')}`;
}

export function formatRest(seconds: number | null): string {
  if (seconds === null) return 'No rest target';
  if (seconds < 60) return `${seconds} sec rest`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s rest` : `${minutes} min rest`;
}
