import { Suspense } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';

import { BottomNavigation } from '../../components/home/BottomNavigation';
import { ActiveWorkoutBanner } from '../../features/workout/ActiveWorkoutBanner';
import { UpdatePrompt } from './UpdatePrompt';

export function AppShell() {
  const home = useLocation().pathname === '/';
  return (
    <div className={`app-frame${home ? ' home-frame' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {!home ? (
        <header className="top-bar">
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

      <main id="main-content" className="main-content" tabIndex={-1}>
        <UpdatePrompt />
        {!home ? <ActiveWorkoutBanner /> : null}
        <Suspense fallback={<p role="status">Opening local screen…</p>}>
          <Outlet />
        </Suspense>
      </main>

      <BottomNavigation home={home} />

      <ScrollRestoration />
    </div>
  );
}
