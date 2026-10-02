import type { ComponentProps } from 'react';

// Width/safe-area ownership stays in AppShell; feature pages only compose their content.
export function MobilePage({ className = '', ...props }: ComponentProps<'section'>) {
  return (
    <section className={`min-w-0 text-sm leading-relaxed text-primary ${className}`} {...props} />
  );
}
