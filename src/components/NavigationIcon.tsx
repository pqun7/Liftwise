import type { ReactNode } from 'react';

type NavigationIconProps = Readonly<{ children: ReactNode }>;

export function NavigationIcon({ children }: NavigationIconProps) {
  return (
    <svg aria-hidden="true" className="nav-icon" viewBox="0 0 24 24" fill="none">
      {children}
    </svg>
  );
}
