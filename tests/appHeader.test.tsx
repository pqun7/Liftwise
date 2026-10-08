import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppHeader } from '../src/components/layout/AppHeader';

describe('shared application header', () => {
  it('retains a complete long title and accessible streak label', () => {
    const title = 'A long translated training title with plenty of context';
    render(
      <MemoryRouter>
        <AppHeader title={title} titleId="page-title" currentStreak={3} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: title })).toHaveAttribute('id', 'page-title');
    expect(screen.getByRole('link', { name: '3 days streak' })).toHaveTextContent('3 days');
    expect(screen.queryByRole('img', { name: 'Liftwise' })).not.toBeInTheDocument();
  });
  it('shows an intentional zero state without changing its accessible label', () => {
    render(
      <MemoryRouter>
        <AppHeader currentStreak={0} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Workout streak' })).toHaveTextContent('0 days');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
