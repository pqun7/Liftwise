import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { HomePage } from '../features/home/HomePage';
import { homeLoader } from '../features/home/homeService';
const CustomExercisePage = lazy(() =>
  import('../features/exercises/CustomExercisePage').then((module) => ({
    default: module.CustomExercisePage,
  })),
);
const ExerciseDetailPage = lazy(() =>
  import('../features/exercises/ExerciseDetailPage').then((module) => ({
    default: module.ExerciseDetailPage,
  })),
);
const ExerciseLibraryPage = lazy(() =>
  import('../features/exercises/ExerciseLibraryPage').then((module) => ({
    default: module.ExerciseLibraryPage,
  })),
);
import { ExerciseRouteError } from '../features/exercises/ExerciseRouteError';
import { exerciseDetailLoader, exerciseLibraryLoader } from '../features/exercises/loaders';
const PlanPage = lazy(() =>
  import('../features/plan/PlanPage').then((module) => ({ default: module.PlanPage })),
);
const ExercisePickerPage = lazy(() =>
  import('../features/plan/ExercisePickerPage').then((module) => ({
    default: module.ExercisePickerPage,
  })),
);
const PrescriptionFormPage = lazy(() =>
  import('../features/plan/PrescriptionFormPage').then((module) => ({
    default: module.PrescriptionFormPage,
  })),
);
const ProgramDayFormPage = lazy(() =>
  import('../features/plan/ProgramDayFormPage').then((module) => ({
    default: module.ProgramDayFormPage,
  })),
);
const ProgramDayPage = lazy(() =>
  import('../features/plan/ProgramDayPage').then((module) => ({ default: module.ProgramDayPage })),
);
const ProgramDetailPage = lazy(() =>
  import('../features/plan/ProgramDetailPage').then((module) => ({
    default: module.ProgramDetailPage,
  })),
);
const ProgramFormPage = lazy(() =>
  import('../features/plan/ProgramFormPage').then((module) => ({
    default: module.ProgramFormPage,
  })),
);
import { ProgramRouteError } from '../features/plan/ProgramRouteError';
const TrainingDaysPage = lazy(() =>
  import('../features/plan/TrainingDaysPage').then((module) => ({
    default: module.TrainingDaysPage,
  })),
);
const ProgramReviewPage = lazy(() =>
  import('../features/plan/ProgramReviewPage').then((module) => ({
    default: module.ProgramReviewPage,
  })),
);
import {
  exercisePickerLoader,
  prescriptionLoader,
  programDayFormLoader,
  programDayLoader,
  programListLoader,
  programLoader,
  programReviewLoader,
} from '../features/plan/loaders';
const ProgressPage = lazy(() =>
  import('../features/progress/ProgressPage').then((module) => ({ default: module.ProgressPage })),
);
const ExerciseHistoryPage = lazy(() =>
  import('../features/progress/ExerciseHistoryPage').then((module) => ({
    default: module.ExerciseHistoryPage,
  })),
);
import {
  progressLoader,
  exerciseHistoryLoader,
  workoutHistoryLoader,
  bodyMeasurementsLoader,
  exercisePickerLoader as progressExercisePickerLoader,
} from '../features/progress/loaders';
import { ProgressSkeleton } from '../features/progress/ProgressUI';
import { ProgressRouteError } from '../features/progress/ProgressRouteError';
const WorkoutHistoryPage = lazy(() =>
  import('../features/progress/WorkoutHistoryPage').then((module) => ({
    default: module.WorkoutHistoryPage,
  })),
);
const BodyMeasurementsPage = lazy(() =>
  import('../features/progress/BodyMetrics').then((module) => ({
    default: module.BodyMeasurementsPage,
  })),
);
const ExerciseInsightsPage = lazy(() =>
  import('../features/progress/ExerciseInsightsPage').then((module) => ({
    default: module.ExerciseInsightsPage,
  })),
);
const DataSafetyPage = lazy(() =>
  import('../features/dataSafety/DataSafetyPage').then((module) => ({
    default: module.DataSafetyPage,
  })),
);
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);
const WorkoutPage = lazy(() =>
  import('../features/workout/WorkoutPage').then((module) => ({ default: module.WorkoutPage })),
);
import { WorkoutRouteError } from '../features/workout/WorkoutRouteError';
const WorkoutExercisePickerPage = lazy(() =>
  import('../features/workout/WorkoutExercisePickerPage').then((module) => ({
    default: module.WorkoutExercisePickerPage,
  })),
);
const WorkoutSessionPage = lazy(() =>
  import('../features/workout/WorkoutSessionPage').then((module) => ({
    default: module.WorkoutSessionPage,
  })),
);
import {
  workoutExercisePickerLoader,
  workoutLandingLoader,
  workoutSessionLoader,
} from '../features/workout/loaders';
import { AppShell } from './shell/AppShell';
import { AppRouteError } from './shell/AppRouteError';
import { NotFoundPage } from './shell/NotFoundPage';

export const routeObjects: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    hydrateFallbackElement: (
      <div className="app-frame">
        <p role="status">Opening your local training space…</p>
      </div>
    ),
    errorElement: <AppRouteError />,
    children: [
      { index: true, element: <HomePage />, loader: homeLoader },
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
        path: 'plan/:programId/build/days',
        element: <TrainingDaysPage />,
        loader: programLoader,
        errorElement: <ProgramRouteError />,
      },
      {
        path: 'plan/:programId/build/review',
        element: <ProgramReviewPage />,
        loader: programReviewLoader,
        errorElement: <ProgramRouteError />,
      },
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
        errorElement: <ProgressRouteError />,
        hydrateFallbackElement: <ProgressSkeleton />,
      },
      {
        path: 'progress/history',
        element: <WorkoutHistoryPage />,
        loader: workoutHistoryLoader,
        errorElement: <ProgressRouteError />,
      },
      {
        path: 'progress/measurements',
        element: <BodyMeasurementsPage />,
        loader: bodyMeasurementsLoader,
        errorElement: <ProgressRouteError />,
      },
      {
        path: 'progress/exercises',
        element: <ExerciseInsightsPage />,
        loader: progressExercisePickerLoader,
        errorElement: <ProgressRouteError />,
      },
      {
        path: 'progress/exercises/:exerciseId',
        element: <ExerciseHistoryPage />,
        loader: exerciseHistoryLoader,
        errorElement: <ProgressRouteError />,
      },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/data-safety', element: <DataSafetyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routeObjects);
