import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { getEntryMode } from './app/entryMode';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Liftwise could not find its application root.');
}

const url = new URL(window.location.href);
const standalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
let enteredApp = false;
try {
  enteredApp = sessionStorage.getItem('liftwise:entered-app') === '1';
} catch {
  // The explicit app URL and standalone detection also work with storage blocked.
}
const mode = getEntryMode(url, standalone, enteredApp);
if (mode === 'application') {
  try {
    sessionStorage.setItem('liftwise:entered-app', '1');
  } catch {
    // Browser privacy settings must not prevent opening the application.
  }
  if (url.pathname === '/install' || url.pathname === '/install/') {
    window.history.replaceState(null, '', '/?app=1');
  }
}

// Keep the guide and its assets out of the application's initial render.
const Screen =
  mode === 'installation'
    ? (await import('./features/installation/InstallationPage')).InstallationPage
    : (await import('./app/Application')).Application;

createRoot(root).render(
  <StrictMode>
    <Screen />
  </StrictMode>,
);
