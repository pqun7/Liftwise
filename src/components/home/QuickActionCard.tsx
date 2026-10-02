import { ChartNoAxesColumnIncreasing, ClipboardPlus, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';

const actions = [
  { title: 'Browse Exercises', to: '/exercises', Icon: Dumbbell, accent: 'mint' },
  { title: 'Create Program', to: '/plan/new', Icon: ClipboardPlus, accent: 'violet' },
  { title: 'View Progress', to: '/progress', Icon: ChartNoAxesColumnIncreasing, accent: 'blue' },
] as const;

export function QuickActions() {
  return (
    <div className="home-quick-grid">
      {actions.map(({ title, to, Icon, accent }) => (
        <Link key={to} to={to} className={`home-quick-card home-accent-${accent}`}>
          <Icon size={25} aria-hidden="true" />
          <span>{title}</span>
        </Link>
      ))}
    </div>
  );
}
