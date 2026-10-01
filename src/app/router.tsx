import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { HomePage } from '../features/home/HomePage';
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
      { path: 'plan', element: <PlanPage /> },
      { path: 'workout', element: <WorkoutPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routeObjects);
