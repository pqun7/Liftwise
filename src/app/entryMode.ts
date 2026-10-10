export type EntryMode = 'application' | 'installation';

/** Installation help is a browser entry point, never an installed-app screen. */
export function getEntryMode(url: URL, standalone: boolean, enteredApp: boolean): EntryMode {
  if (standalone) return 'application';
  if (url.pathname === '/install' || url.pathname === '/install/') return 'installation';
  if (url.pathname !== '/' || url.searchParams.get('app') === '1' || enteredApp) {
    return 'application';
  }
  return 'installation';
}
