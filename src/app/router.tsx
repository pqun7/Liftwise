import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { HomePage } from '../features/home/HomePage';
import { CustomExercisePage } from '../features/exercises/CustomExercisePage';
import { ExerciseDetailPage } from '../features/exercises/ExerciseDetailPage';
import { ExerciseLibraryPage } from '../features/exercises/ExerciseLibraryPage';
import { ExerciseRouteError } from '../features/exercises/ExerciseRouteError';
import { exerciseDetailLoader, exerciseLibraryLoader } from '../features/exercises/loaders';
import { PlanPage } from '../features/plan/PlanPage';
import { ProgressPage } from '../features/progress/ProgressPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { WorkoutPage } from '../features/workout/WorkoutPage';
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
      { path: 'plan', element: <PlanPage /> },
      { path: 'workout', element: <WorkoutPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routeObjects);
