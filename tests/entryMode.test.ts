import { describe, expect, it } from 'vitest';
import { getEntryMode } from '../src/app/entryMode';

describe('browser guide and installed application separation', () => {
  it('shows the guide to a new browser visitor', () => {
    expect(getEntryMode(new URL('https://liftwise.test/'), false, false)).toBe('installation');
  });

  it('opens the application through the explicit launch link and preserves browser sessions', () => {
    expect(getEntryMode(new URL('https://liftwise.test/?app=1'), false, false)).toBe('application');
    expect(getEntryMode(new URL('https://liftwise.test/'), false, true)).toBe('application');
  });

  it('never shows the guide in standalone mode, including old home-screen shortcuts', () => {
    for (const path of ['/', '/?app=1', '/install', '/install/']) {
      expect(getEntryMode(new URL(path, 'https://liftwise.test'), true, false)).toBe('application');
    }
  });

  it('keeps existing application deep links working', () => {
    for (const path of ['/plan', '/workout', '/progress', '/settings']) {
      expect(getEntryMode(new URL(path, 'https://liftwise.test'), false, false)).toBe(
        'application',
      );
    }
  });

  it('allows browser installation help after entering the application', () => {
    expect(getEntryMode(new URL('https://liftwise.test/install'), false, true)).toBe(
      'installation',
    );
  });
});
