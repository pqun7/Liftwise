import { AppHeader } from '../../components/layout/AppHeader';
import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { iconButtonClasses } from '../../components/ui/controlStyles';
import { ScreenStateProvider } from '../ScreenStateProvider';
import { useRouteStreak } from '../../features/progress/useRouteStreak';
import { useCalendarRevalidation } from './useCalendarRevalidation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useVisualViewport } from './useVisualViewport';
import {
  Outlet,
  ScrollRestoration,
  useLocation,
  useMatches,
  useNavigation,
  useRevalidator,
} from 'react-router-dom';
import { watchWorkoutLifecycle } from '../../features/workout/workoutLifecycle';
import { SessionReturnBar } from '../../features/workout/SessionReturnBar';
import { database } from '../../lib/storage/database';
import { WorkoutRepository } from '../../lib/storage/repositories/workoutRepository';

import { BottomNavigation } from '../../components/layout/BottomNavigation';
import { UpdatePrompt } from './UpdatePrompt';
import { ProgressSkeleton } from '../../features/progress/ProgressUI';

export function AppShell() {
  const frame = useRef<HTMLDivElement>(null);
  useVisualViewport(frame);
  const { revalidate } = useRevalidator();
  const [timingError, setTimingError] = useState<string | null>(null);
  useEffect(
    () =>
      watchWorkoutLifecycle(() => {
        void revalidate();
      }, setTimingError),
    [revalidate],
  );
  const location = useLocation();
  const pathname = location.pathname;
  const previousPath = useRef(pathname);
  useEffect(() => {
    const previous = previousPath.current;
    previousPath.current = pathname;
    // The main logger flushes its drafts before leaving. Cover its child routes too.
    const leftChild = /^\/workout\/[^/]+\/.+/.test(previous) || previous.startsWith('/exercises/');
    const continuing = /^\/workout\/[^/]+/.test(pathname) || pathname.startsWith('/exercises/');
    if (!leftChild || continuing) return;
    const repository = new WorkoutRepository(database);
    void repository
      .getUnfinished()
      .then(async (workout) => {
        if (workout?.session.status === 'active') {
          await repository.pauseForDeparture(workout.session.id);
          await revalidate();
        }
      })
      .catch(() => setTimingError('Your workout could not be paused. Return to it and retry.'));
  }, [pathname, revalidate]);
  const [planReturnTo, setPlanReturnTo] = useState('/plan');
  useEffect(() => {
    if (location.pathname === '/plan' || location.pathname.startsWith('/plan/')) {
      setPlanReturnTo(location.pathname + location.search + location.hash);
    }
  }, [location.pathname, location.search, location.hash]);
  useCalendarRevalidation(
    !/^\/workout\/[^/]+/.test(pathname) &&
      (!/^\/plan\/.+/.test(pathname) || pathname.startsWith('/plan/calendar')),
  );
  const streak = useRouteStreak();
  const navigation = useNavigation();
  const home = pathname === '/';
  const plan = pathname === '/plan' || pathname.startsWith('/plan/');
  const progress = pathname === '/progress' || pathname.startsWith('/progress/');
  const focused = useMatches().some(({ data }) => {
    const status = (data as { workout?: { session?: { status?: string } } } | undefined)?.workout
      ?.session?.status;
    return (
      /^\/workout\/[^/]+$/.test(pathname) &&
      (status === 'active' || status === 'paused' || status === 'completed')
    );
  });
  const pages: Record<string, [string, string]> = {
    '/': ['Welcome to Liftwise', 'home-title'],
    '/plan': ['Plan', 'plan-title'],
    '/workout': ['Start training', 'workout-title'],
    '/progress': ['Progress', 'progress-title'],
    '/settings': ['Make Liftwise yours', 'settings-title'],
    '/exercises': ['Find your next movement', 'exercise-library-title'],
  };
  const page = pages[pathname];
  return (
    <ScreenStateProvider>
      <div
        ref={frame}
        className={`app-frame mx-auto min-h-dvh w-full max-w-[430px] ${plan ? 'plan-frame' : ''} pl-[max(16px,var(--safe-left))] pr-[max(16px,var(--safe-right))] text-primary${home ? ' home-frame' : ''}`}
      >
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>

        {!focused ? <SessionReturnBar /> : null}
        {!focused ? (
          <AppHeader
            title={page?.[0]}
            titleId={page?.[1]}
            currentStreak={pathname === '/settings' ? undefined : streak?.currentStreak}
            showStreak={pathname !== '/settings'}
            action={
              home || pathname === '/plan' ? (
                <Link
                  to="/plan/calendar"
                  aria-label="Open calendar"
                  className={`${iconButtonClasses()} app-header-calendar`}
                >
                  <CalendarDays size={22} aria-hidden="true" />
                </Link>
              ) : undefined
            }
          />
        ) : null}

        <main
          id="main-content"
          className={`main-content min-w-0 pb-[var(--navigation-clearance)] ${focused ? 'pt-[calc(12px+var(--safe-top))]' : 'pt-3'}`}
          tabIndex={-1}
        >
          <UpdatePrompt />
          {timingError ? (
            <p role="alert" className="text-danger">
              {timingError}
            </p>
          ) : null}
          <Suspense
            fallback={progress ? <ProgressSkeleton /> : <p role="status">Opening local screen…</p>}
          >
            {navigation.state === 'loading' &&
            navigation.location.pathname !== pathname &&
            navigation.location.pathname.startsWith('/progress') ? (
              <ProgressSkeleton />
            ) : (
              <Outlet />
            )}
          </Suspense>
        </main>

        <BottomNavigation planReturnTo={plan ? '/plan' : planReturnTo} />

        <ScrollRestoration
          getKey={(location) =>
            ['/', '/plan', '/workout', '/progress', '/settings', '/exercises'].includes(
              location.pathname,
            )
              ? location.pathname + location.search
              : location.key
          }
        />
      </div>
    </ScreenStateProvider>
  );
}
