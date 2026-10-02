import type { ReactNode } from 'react';

export function SectionHeader({
  title,
  trailing,
  id,
}: {
  title: string;
  trailing?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <h2 id={id} className="text-lg font-bold leading-tight text-primary">
        {title}
      </h2>
      {trailing}
    </div>
  );
}
