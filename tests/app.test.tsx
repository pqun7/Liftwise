import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { routeObjects } from '../src/app/router';

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
  it('renders the home screen and primary navigation', () => {
    renderRoute();

    expect(screen.getByRole('heading', { name: /welcome to liftwise/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary/i }).querySelectorAll('a')).toHaveLength(
      5,
    );
  });

  it('navigates between feature placeholders', async () => {
    const user = userEvent.setup();
    renderRoute();

    await user.click(screen.getByRole('link', { name: /settings/i }));

    expect(screen.getByRole('heading', { name: /make liftwise yours/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Liftwise v0.7.0' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Data Safety' })).toHaveAttribute(
      'href',
      '/settings/data-safety',
    );
    expect(screen.getByRole('link', { name: /exercise data by repdb/i })).toHaveAttribute(
      'href',
      'https://repdb.co',
    );
  });

  it('renders a safe not-found screen for unknown routes', () => {
    renderRoute('/does-not-exist');

    expect(screen.getByRole('heading', { name: /that screen is not here/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return home/i })).toHaveAttribute('href', '/');
  });
});
