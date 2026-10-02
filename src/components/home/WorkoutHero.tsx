import { Button } from '../ui/Button';
import { buttonClasses } from '../ui/controlStyles';
import { Card } from '../ui/Card';
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
    <Card
      as="article"
      padding="none"
      radius="hero"
      className={`home-hero relative isolate min-h-[275px] overflow-hidden ${day ? '' : 'home-hero-rest'}`}
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
            <Button
              type="button"
              variant="primary"
              size="large"
              className="flex-1"
              disabled={busy}
              onClick={start}
            >
              <Play size={19} fill="currentColor" aria-hidden="true" />
              {busy ? 'Starting…' : 'Start Workout'}
            </Button>
          ) : (
            <Link
              className={buttonClasses('primary', 'flex-1', 'large')}
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
            <Link className={buttonClasses('secondary')} to="/plan/new">
              Create Program
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
