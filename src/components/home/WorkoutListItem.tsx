import { Check, ChevronRight, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';

export function WorkoutListItem({
  title,
  metadata,
  to,
  status,
  completed = false,
}: {
  title: string;
  metadata: string;
  to: string;
  status?: string;
  completed?: boolean;
}) {
  return (
    <Link to={to} className="home-list-item ui-card ui-card-interactive">
      <span className={`home-tile-icon${completed ? ' home-tile-icon-completed' : ''}`}>
        {completed ? (
          <Check size={20} aria-hidden="true" />
        ) : (
          <Dumbbell size={23} aria-hidden="true" />
        )}
      </span>
      <span className="home-list-copy">
        <strong>{title}</strong>
        <span>{metadata}</span>
      </span>
      <span className="home-list-end">
        {status ? <span className="home-badge">{status}</span> : null}
        <ChevronRight size={18} aria-hidden="true" />
      </span>
    </Link>
  );
}
