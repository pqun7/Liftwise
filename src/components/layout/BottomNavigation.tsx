import { NavLink } from 'react-router-dom';
import { navigationItems } from '../../app/navigation';

export function BottomNavigation() {
  return (
    <nav
      className="bottom-nav fixed bottom-0 left-1/2 right-auto z-40 mx-0 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-5 gap-1 rounded-t-[28px] border border-border bg-surface/95 pl-[max(8px,var(--safe-left))] pr-[max(8px,var(--safe-right))] pt-2 pb-[calc(8px+var(--safe-bottom))] font-text backdrop-blur-2xl"
      aria-label="Primary navigation"
    >
      {navigationItems.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `nav-item flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] border text-xs no-underline [&>svg]:size-6 ${isActive ? 'nav-item-active border-mint/20 bg-mint/10 font-semibold text-mint' : 'border-transparent bg-transparent text-secondary'}`
          }
        >
          {icon}
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
