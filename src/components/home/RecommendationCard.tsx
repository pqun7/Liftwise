import { Activity, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Recommendations() {
  return (
    <div className="home-secondary-grid">
      <Link className="home-recommendation home-surface" to="/exercises?bodyPart=chest">
        <Dumbbell className="home-violet" size={24} aria-hidden="true" />
        <span>
          <strong>Upper Body</strong>
          <small>Explore exercises</small>
        </span>
      </Link>
      <Link className="home-recommendation home-surface" to="/exercises?q=stretch">
        <Activity className="home-coral" size={24} aria-hidden="true" />
        <span>
          <strong>Recovery & Mobility</strong>
          <small>Browse movements</small>
        </span>
      </Link>
    </div>
  );
}
