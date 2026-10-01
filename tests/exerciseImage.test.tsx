import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ExerciseImage } from '../src/features/exercises/ExerciseImage';

describe('ExerciseImage', () => {
  it('uses a meaningful alt and falls back when media is missing', () => {
    render(
      <ExerciseImage
        image={{
          path: '/repdb-media/flat/bench-press-start.webp',
          width: 512,
          height: 512,
          alt: 'Bench Press start position',
        }}
      />,
    );

    const image = screen.getByRole('img', { name: 'Bench Press start position' });
    expect(image).toHaveAttribute('width', '512');
    fireEvent.error(image);
    expect(screen.getByRole('img', { name: 'No illustration' })).toBeInTheDocument();
  });

  it('renders the placeholder when an exercise has no image', () => {
    render(<ExerciseImage image={null} />);
    expect(screen.getByRole('img', { name: 'No illustration' })).toBeInTheDocument();
  });
});
