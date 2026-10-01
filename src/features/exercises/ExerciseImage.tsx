import { useState } from 'react';

import type { ExerciseImage as ExerciseImageModel } from '../../domain/entities';

interface ExerciseImageProps {
  image: ExerciseImageModel | null;
  className?: string;
}

export function ExerciseImage({ image, className = '' }: ExerciseImageProps) {
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return (
      <div
        className={`exercise-image-fallback ${className}`}
        role="img"
        aria-label="No illustration"
      >
        <span aria-hidden="true">LW</span>
      </div>
    );
  }

  return (
    <img
      className={`exercise-image ${className}`}
      src={image.path}
      width={image.width}
      height={image.height}
      alt={image.alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
