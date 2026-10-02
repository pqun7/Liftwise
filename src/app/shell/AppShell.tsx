import { Suspense } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';

import { BottomNavigation } from '../../components/layout/BottomNavigation';
import { ActiveWorkoutBanner } from '../../features/workout/ActiveWorkoutBanner';
import { UpdatePrompt } from './UpdatePrompt';

export function AppShell() {
  const pathname = useLocation().pathname;
  const home = pathname === '/';
  const plan = pathname === '/plan' || pathname.startsWith('/plan/');
  return (
    <div
      className={`app-frame mx-auto min-h-dvh w-full max-w-[430px] bg-[radial-gradient(circle_at_85%_5%,rgb(20_120_90_/_15%),transparent_35%)] pl-[max(16px,var(--safe-left))] pr-[max(16px,var(--safe-right))] text-primary${home ? ' home-frame' : ''}${plan ? ' plan-frame' : ''}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {!home && !plan ? (
        <header className="top-bar flex items-center justify-between gap-3 pt-[calc(22px+var(--safe-top))] pb-2">
          <div>
            <p className="eyebrow">Your private training space</p>
            <p className="brand" aria-label="Liftwise">
              Lift<span>wise</span>
            </p>
          </div>
          <div className="offline-badge" aria-label="Works offline">
            <span aria-hidden="true" />
            Local
          </div>
        </header>
      ) : null}

      <main
        id="main-content"
        className="main-content min-w-0 pt-[calc(18px+var(--safe-top))] pb-[calc(112px+var(--safe-bottom))]"
        tabIndex={-1}
      >
        <UpdatePrompt />
        {!home ? <ActiveWorkoutBanner /> : null}
        <Suspense fallback={<p role="status">Opening local screen…</p>}>
          <Outlet />
        </Suspense>
      </main>

      <BottomNavigation />

      <ScrollRestoration />
    </div>
  );
}
