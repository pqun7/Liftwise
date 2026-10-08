import { ChartNoAxesColumnIncreasing, ClipboardPlus, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';

const actions = [
  { title: 'Browse Exercises', to: '/exercises', Icon: Dumbbell },
  { title: 'Create Program', to: '/plan/new', Icon: ClipboardPlus },
  { title: 'View Progress', to: '/progress', Icon: ChartNoAxesColumnIncreasing },
] as const;

export function QuickActions() {
  return (
    <div className="home-quick-grid">
      {actions.map(({ title, to, Icon }) => (
        <Link key={to} to={to} className="home-quick-card ui-card ui-card-interactive">
          <Icon size={22} strokeWidth={1.7} className="text-mint" aria-hidden="true" />
          <span>{title}</span>
        </Link>
      ))}
    </div>
  );
}
