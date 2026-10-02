import { ArrowRight, Dumbbell, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import bench from '../../assets/images/workout-bench.webp';
import rest from '../../assets/images/rest-day.webp';
import { programDayMetadata, type HomeData } from '../../features/home/homeData';

export function WorkoutHero({
  data,
  scheduled,
  busy,
  start,
  isToday,
}: {
  data: HomeData;
  scheduled: boolean;
  busy: boolean;
  start: () => void;
  isToday: boolean;
}) {
  const day = scheduled ? data.suggestion : null;
  return (
    <article
      className={`home-hero${day ? '' : ' home-hero-rest'}`}
      aria-labelledby="home-hero-title"
    >
      <img
        src={day ? bench : rest}
        alt=""
        className="home-hero-image"
        width="1672"
        height="941"
        fetchPriority="high"
      />
      <div className="home-hero-content">
        <div className="home-hero-heading">
          <p className="home-kicker">{day ? "Today's workout" : 'Time to recharge'}</p>
          {day && data.activeProgramId ? (
            <Link className="home-text-link" to={`/plan/${data.activeProgramId}`}>
              View Plan
            </Link>
          ) : null}
        </div>
        <h2 id="home-hero-title">
          {day ? day.day.name : isToday ? 'No workout today' : 'No workout scheduled'}
        </h2>
        <p className="home-hero-meta">
          {day ? programDayMetadata(day) : 'Take a rest day or start an optional workout.'}
        </p>
        {day ? (
          <div className="home-tags">
            <span>Next in your program</span>
            <span>Train at your pace</span>
          </div>
        ) : null}
        <div className="home-hero-actions">
          {day ? (
            <button type="button" className="home-primary" disabled={busy} onClick={start}>
              <Play size={19} fill="currentColor" aria-hidden="true" />
              {busy ? 'Starting…' : 'Start Workout'}
            </button>
          ) : (
            <Link
              className="home-primary"
              to="/exercises"
              aria-label="Browse Exercises — Exercise Library"
            >
              <Dumbbell size={18} aria-hidden="true" />
              Browse Exercises
            </Link>
          )}
          {day ? (
            <Link className="home-icon-link" aria-label="Choose a different workout" to="/workout">
              <ArrowRight size={22} aria-hidden="true" />
            </Link>
          ) : (
            <Link className="home-secondary" to="/plan/new">
              Create Program
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
