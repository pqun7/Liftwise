import { NavLink } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { navigationItems } from '../../app/navigation';

export function BottomNavigation({ planReturnTo = '/plan' }: { planReturnTo?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = ref.current;
    const frame = nav?.closest<HTMLElement>('.app-frame');
    if (!nav || !frame) return;
    const observer = new ResizeObserver(() => {
      frame.style.setProperty('--navigation-height', `${nav.getBoundingClientRect().height}px`);
    });
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);
  return (
    <nav
      ref={ref}
      className="bottom-nav fixed bottom-0 left-1/2 right-auto z-40 mx-0 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-5 gap-0.5 rounded-t-[22px] border border-border bg-surface pl-[max(8px,var(--safe-left))] pr-[max(8px,var(--safe-right))] pt-2 pb-[calc(8px+var(--safe-bottom))] font-text"
      aria-label="Primary navigation"
    >
      {navigationItems.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to === '/plan' ? planReturnTo : to}
          end={to === '/'}
          className={({ isActive }) =>
            `nav-item flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border type-navigation no-underline transition-colors duration-200 hover:bg-surface-highlight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mint [&>svg]:size-6 ${isActive ? 'nav-item-active border-mint/10 bg-mint/[0.07] font-semibold text-mint' : 'border-transparent bg-transparent text-muted'}`
          }
        >
          {icon}
          <span className="max-w-full text-center wrap-anywhere">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
