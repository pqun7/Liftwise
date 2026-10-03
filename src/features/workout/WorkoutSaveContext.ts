import { createContext } from 'react';
import type { WorkoutSaveQueue } from './workoutSaveQueue';

export const WorkoutSaveContext = createContext<WorkoutSaveQueue | null>(null);
