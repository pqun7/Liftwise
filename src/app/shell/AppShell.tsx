import { StreakBadge } from '../../components/ui/StreakBadge';
import { AppWordmark } from '../../components/ui/AppWordmark';
import { useRouteStreak } from '../../features/progress/useRouteStreak';
import { useCalendarRevalidation } from './useCalendarRevalidation';
import { Suspense } from 'react';
import {
  Outlet,
  ScrollRestoration,
  useLocation,
  useMatches,
  useNavigation,
} from 'react-router-dom';

import { BottomNavigation } from '../../components/layout/BottomNavigation';
import { ActiveWorkoutBanner } from '../../features/workout/ActiveWorkoutBanner';
import { UpdatePrompt } from './UpdatePrompt';
import { ProgressSkeleton } from '../../features/progress/ProgressUI';

export function AppShell() {
  const pathname = useLocation().pathname;
  useCalendarRevalidation(!pathname.startsWith('/workout') && !pathname.startsWith('/plan'));
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
  return (
    <div
      className={`app-frame mx-auto min-h-dvh w-full max-w-[430px] bg-[radial-gradient(circle_at_85%_5%,rgb(20_120_90_/_15%),transparent_35%)] pl-[max(16px,var(--safe-left))] pr-[max(16px,var(--safe-right))] text-primary${home ? ' home-frame' : ''}${plan ? ' plan-frame' : ''}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {!home && !plan && !progress && !pathname.startsWith('/workout') && !focused ? (
        <header className="top-bar flex flex-wrap items-center justify-between gap-3 pt-[calc(22px+var(--safe-top))] pb-2">
          <div>
            <p className="eyebrow">Your private training space</p>
            <AppWordmark />
          </div>
          <StreakBadge currentStreak={streak?.currentStreak ?? 0} />
        </header>
      ) : null}

      <main
        id="main-content"
        className={`main-content min-w-0 pt-[calc(18px+var(--safe-top))] ${focused ? 'pb-[calc(24px+var(--safe-bottom))]' : 'pb-[calc(112px+var(--safe-bottom))]'}`}
        tabIndex={-1}
      >
        <UpdatePrompt />
        {!home && !focused && pathname !== '/workout' ? <ActiveWorkoutBanner /> : null}
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

      {!focused ? <BottomNavigation /> : null}

      <ScrollRestoration />
    </div>
  );
}
