import type { BrowserContext, Route } from '@playwright/test';

const blockNetwork = (route: Route) => route.abort('internetdisconnected');

// Playwright WebKit's offline switch blocks service-worker chunk loads too
// (reproduced on Windows and Linux). Abort network requests instead; Chromium
// independently exercises native offline mode and offline document reloads.
export async function setOffline(context: BrowserContext, browserName: string, offline: boolean) {
  if (browserName === 'webkit') {
    if (offline) await context.route('**/*', blockNetwork);
    else await context.unroute('**/*', blockNetwork);
  } else await context.setOffline(offline);
}
