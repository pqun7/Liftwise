import { Activity, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Recommendations() {
  return (
    <div className="home-secondary-grid">
      <Link className="home-recommendation home-surface ui-card" to="/exercises?bodyPart=chest">
        <Dumbbell className="text-mint" size={24} aria-hidden="true" />
        <span>
          <strong>Upper Body</strong>
          <small>Explore exercises</small>
        </span>
      </Link>
      <Link className="home-recommendation home-surface ui-card" to="/exercises?q=stretch">
        <Activity className="text-mint" size={24} aria-hidden="true" />
        <span>
          <strong>Recovery & Mobility</strong>
          <small>Browse movements</small>
        </span>
      </Link>
    </div>
  );
}
