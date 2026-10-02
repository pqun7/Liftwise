import { NavLink } from 'react-router-dom';
import { navigationItems } from '../../app/navigation';

export function BottomNavigation({ home }: { home: boolean }) {
  return (
    <nav className={`bottom-nav${home ? ' home-bottom-nav' : ''}`} aria-label="Primary navigation">
      {navigationItems.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' nav-item-active' : ''}`}
        >
          {icon}
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
