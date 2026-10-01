import { NavLink, Outlet, ScrollRestoration } from 'react-router-dom';

import { navigationItems } from '../navigation';
import { UpdatePrompt } from './UpdatePrompt';

export function AppShell() {
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

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

      <main id="main-content" className="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' nav-item-active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <UpdatePrompt />
      <ScrollRestoration />
    </div>
  );
}
