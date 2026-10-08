export interface WorkoutCompleteData {
  name: string;
  exercises: number;
  completedSets: number;
  totalSets: number;
  duration: number;
  totalVolume: number;
  rir: number | null;
}

export const workout: WorkoutCompleteData = {
  name: 'Upper B',
  exercises: 6,
  completedSets: 15,
  totalSets: 15,
  duration: 3,
  totalVolume: 817.5,
  rir: null,
};
