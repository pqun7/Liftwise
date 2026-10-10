import { Button } from '../ui/Button';
import { buttonClasses } from '../ui/controlStyles';
import { Card } from '../ui/Card';
import { ArrowRight, Leaf, Play, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import bench from '../../assets/images/workout-bench.webp';
import rest from '../../assets/images/rest-day.webp';
import { sessionCalendarDate } from '../../domain/trainingCalendar';
import { programDayMetadata, type HomeData } from '../../features/home/homeData';

export function WorkoutHero({
  data,
  scheduled,
  busy,
  start,
  isToday,
  selectedDate = data.today,
}: {
  data: HomeData;
  scheduled: boolean;
  busy: boolean;
  start: () => void;
  isToday: boolean;
  selectedDate?: string;
}) {
  const completed = data.weekHistory.find(
    ({ session }) =>
      sessionCalendarDate(session) === selectedDate &&
      (!scheduled || !data.suggestion || session.programDayId === data.suggestion.day.id),
  );
  const day = scheduled && !completed ? data.suggestion : null;
  return (
    <Card
      as="article"
      padding="none"
      radius="hero"
      className={`home-hero relative isolate overflow-hidden ${day ? '' : 'home-hero-rest'}`}
      aria-labelledby="home-hero-title"
    >
      <img
        src={completed ? rest : bench}
        alt=""
        className="home-hero-image"
        width="1672"
        height="941"
        fetchPriority="high"
      />
      <div className="home-hero-content">
        <div className="home-hero-heading">
          <p className={`home-kicker${!day && !completed ? ' home-recovery-kicker' : ''}`}>
            {!day && !completed ? <Sun size={22} aria-hidden="true" /> : null}
            {day
              ? data.calendar.dated
                ? isToday
                  ? "Today's workout"
                  : 'Selected date’s workout'
                : 'Next in your program'
              : completed
                ? isToday
                  ? 'Completed today'
                  : 'Completed workout'
                : isToday
                  ? 'Today · Rest Day'
                  : 'Selected day · Rest Day'}
          </p>
          {day && data.activeProgramId ? (
            <Link className="home-text-link" to={`/plan/${data.activeProgramId}`}>
              View Plan
            </Link>
          ) : null}
        </div>
        <h2 id="home-hero-title">
          {day
            ? day.day.name
            : completed
              ? 'Training complete'
              : isToday
                ? 'Recovery Day'
                : 'No workout scheduled'}
        </h2>
        <p className="home-hero-meta">
          {day
            ? programDayMetadata(day)
            : completed
              ? `${completed.session.name ?? 'Workout'} · Saved locally`
              : 'No workout scheduled. Focus on recovery and come back stronger.'}
        </p>
        {day ? (
          <div className="home-tags">
            <span>
              {data.calendar.dated
                ? isToday
                  ? 'Scheduled today'
                  : 'Scheduled on selected date'
                : 'Next in your program'}
            </span>
            <span>Train at your pace</span>
          </div>
        ) : null}
        <div className="home-hero-actions">
          {day && !isToday ? (
            <Link
              className={buttonClasses('primary', '', 'large')}
              to={`/plan/${day.day.programId}/days/${day.day.id}`}
            >
              View Scheduled Workout
            </Link>
          ) : day ? (
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
          ) : completed ? (
            <Link
              className={buttonClasses('primary', '', 'large')}
              to={`/workout/${completed.session.id}?details=1`}
            >
              View Completed Workout
            </Link>
          ) : (
            <Link className={buttonClasses('primary', '', 'large')} to="/exercises?q=stretch">
              <Leaf size={18} aria-hidden="true" />
              Recovery Tips
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          )}
          {day ? (
            <Link
              className="home-icon-link ui-button ui-button-secondary"
              aria-label="Choose a different workout"
              to="/workout"
            >
              <ArrowRight size={22} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
