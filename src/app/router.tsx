import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { HomePage } from '../features/home/HomePage';
import { CustomExercisePage } from '../features/exercises/CustomExercisePage';
import { ExerciseDetailPage } from '../features/exercises/ExerciseDetailPage';
import { ExerciseLibraryPage } from '../features/exercises/ExerciseLibraryPage';
import { ExerciseRouteError } from '../features/exercises/ExerciseRouteError';
import { exerciseDetailLoader, exerciseLibraryLoader } from '../features/exercises/loaders';
import { PlanPage } from '../features/plan/PlanPage';
import { ExercisePickerPage } from '../features/plan/ExercisePickerPage';
import { PrescriptionFormPage } from '../features/plan/PrescriptionFormPage';
import { ProgramDayFormPage } from '../features/plan/ProgramDayFormPage';
import { ProgramDayPage } from '../features/plan/ProgramDayPage';
import { ProgramDetailPage } from '../features/plan/ProgramDetailPage';
import { ProgramFormPage } from '../features/plan/ProgramFormPage';
import { ProgramRouteError } from '../features/plan/ProgramRouteError';
import {
  exercisePickerLoader,
  prescriptionLoader,
  programDayFormLoader,
  programDayLoader,
  programListLoader,
  programLoader,
} from '../features/plan/loaders';
import { ProgressPage } from '../features/progress/ProgressPage';
import { ExerciseHistoryPage } from '../features/progress/ExerciseHistoryPage';
import { progressLoader, exerciseHistoryLoader } from '../features/progress/loaders';
import { DataSafetyPage } from '../features/dataSafety/DataSafetyPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { WorkoutPage } from '../features/workout/WorkoutPage';
import { WorkoutRouteError } from '../features/workout/WorkoutRouteError';
import { WorkoutExercisePickerPage } from '../features/workout/WorkoutExercisePickerPage';
import { WorkoutSessionPage } from '../features/workout/WorkoutSessionPage';
import {
  workoutExercisePickerLoader,
  workoutLandingLoader,
  workoutSessionLoader,
} from '../features/workout/loaders';
import { AppShell } from './shell/AppShell';
import { NotFoundPage } from './shell/NotFoundPage';

export const routeObjects: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'exercises',
        element: <ExerciseLibraryPage />,
        loader: exerciseLibraryLoader,
        errorElement: <ExerciseRouteError />,
      },
      { path: 'exercises/new', element: <CustomExercisePage /> },
      {
        path: 'exercises/:exerciseId',
        element: <ExerciseDetailPage />,
        loader: exerciseDetailLoader,
        errorElement: <ExerciseRouteError />,
      },
      {
        path: 'plan',
        element: <PlanPage />,
        loader: programListLoader,
        errorElement: <ProgramRouteError />,
      },
      { path: 'plan/new', element: <ProgramFormPage mode="create" /> },
      {
        path: 'plan/:programId',
        element: <ProgramDetailPage />,
        loader: programLoader,
        errorElement: <ProgramRouteError />,
      },
      {
        path: 'plan/:programId/edit',
        element: <ProgramFormPage mode="edit" />,
        loader: programLoader,
        errorElement: <ProgramRouteError />,
      },
      {
        path: 'plan/:programId/days/new',
        element: <ProgramDayFormPage mode="create" />,
        loader: programLoader,
        errorElement: <ProgramRouteError />,
      },
      {
        path: 'plan/:programId/days/:dayId',
        element: <ProgramDayPage />,
        loader: programDayLoader,
        errorElement: <ProgramRouteError />,
      },
      {
        path: 'plan/:programId/days/:dayId/edit',
        element: <ProgramDayFormPage mode="edit" />,
        loader: programDayFormLoader,
        errorElement: <ProgramRouteError />,
      },
      {
        path: 'plan/:programId/days/:dayId/exercises',
        element: <ExercisePickerPage />,
        loader: exercisePickerLoader,
        errorElement: <ProgramRouteError />,
      },
      {
        path: 'plan/:programId/days/:dayId/exercises/add/:exerciseId',
        element: <PrescriptionFormPage />,
        loader: prescriptionLoader,
        errorElement: <ProgramRouteError />,
      },
      {
        path: 'plan/:programId/days/:dayId/exercises/:programExerciseId/edit',
        element: <PrescriptionFormPage />,
        loader: prescriptionLoader,
        errorElement: <ProgramRouteError />,
      },
      {
        path: 'workout',
        element: <WorkoutPage />,
        loader: workoutLandingLoader,
        errorElement: <WorkoutRouteError />,
      },
      {
        path: 'workout/:workoutId',
        element: <WorkoutSessionPage />,
        loader: workoutSessionLoader,
        errorElement: <WorkoutRouteError />,
      },
      {
        path: 'workout/:workoutId/exercises',
        element: <WorkoutExercisePickerPage />,
        loader: workoutExercisePickerLoader,
        errorElement: <WorkoutRouteError />,
      },
      {
        path: 'progress',
        element: <ProgressPage />,
        loader: progressLoader,
        errorElement: <WorkoutRouteError />,
      },
      {
        path: 'progress/exercises/:exerciseId',
        element: <ExerciseHistoryPage />,
        loader: exerciseHistoryLoader,
        errorElement: <WorkoutRouteError />,
      },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/data-safety', element: <DataSafetyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routeObjects);
