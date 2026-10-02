import type { BrowserContext, Route } from '@playwright/test';

const blockNetwork = (route: Route) => route.abort('internetdisconnected');

// Windows WebKit's offline switch blocks service-worker chunk loads too. Abort
// actual network requests there; Chromium/Linux still exercise native offline mode.
export async function setOffline(context: BrowserContext, browserName: string, offline: boolean) {
  if (process.platform === 'win32' && browserName === 'webkit') {
    if (offline) await context.route('**/*', blockNetwork);
    else await context.unroute('**/*', blockNetwork);
  } else await context.setOffline(offline);
}
