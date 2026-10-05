import { progressRepository } from '../src/features/progress/progressService';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { routeObjects } from '../src/app/router';
import { APP_VERSION } from '../src/app/version';
import { AppRouteError } from '../src/app/shell/AppRouteError';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

function renderRoute(initialEntry = '/') {
  return render(
    <RouterProvider
      router={createMemoryRouter(routeObjects, { initialEntries: [initialEntry] })}
    />,
  );
}

describe('Liftwise app shell', () => {
  it('explains an unexpected screen error without resetting user data', async () => {
    render(
      <RouterProvider
        router={createMemoryRouter([
          {
            path: '/',
            element: <div>Opening</div>,
            hydrateFallbackElement: <div>Opening</div>,
            loader: () => {
              throw new Error('Storage temporarily unavailable');
            },
            errorElement: <AppRouteError />,
          },
        ])}
      />,
    );
    expect(
      await screen.findByRole('heading', { name: 'Liftwise could not open this screen' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Storage temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Data Safety' })).toHaveAttribute(
      'href',
      '/settings/data-safety',
    );
    expect(screen.getByRole('button', { name: 'Retry this screen' })).toBeInTheDocument();
  });
  it('renders the home screen and primary navigation', async () => {
    renderRoute();

    expect(
      await screen.findByRole('heading', { name: /welcome to liftwise/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary/i }).querySelectorAll('a')).toHaveLength(
      5,
    );
  });

  it('navigates between feature placeholders', async () => {
    const user = userEvent.setup();
    renderRoute();

    await user.click(await screen.findByRole('link', { name: 'More' }));

    expect(
      await screen.findByRole('heading', { name: /make liftwise yours/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: `Liftwise v${APP_VERSION}` })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Data Safety' })).toHaveAttribute(
      'href',
      '/settings/data-safety',
    );
    expect(screen.getByRole('link', { name: /exercise data by repdb/i })).toHaveAttribute(
      'href',
      'https://repdb.co',
    );
  });

  it('keeps Settings available when optional header streak data cannot load', async () => {
    const streak = vi
      .spyOn(progressRepository, 'streak')
      .mockRejectedValueOnce(new Error('History unavailable'));
    try {
      renderRoute('/settings');
      expect(await screen.findByRole('heading', { name: /make liftwise yours/i })).toBeVisible();
      expect(screen.getByRole('link', { name: 'Open Data Safety' })).toBeVisible();
    } finally {
      streak.mockRestore();
    }
  });

  it('renders a safe not-found screen for unknown routes', async () => {
    renderRoute('/does-not-exist');

    expect(
      await screen.findByRole('heading', { name: /that screen is not here/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return home/i })).toHaveAttribute('href', '/');
  });
});
