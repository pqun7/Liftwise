import { MobilePage } from '../../components/layout/MobilePage';
import { dateFromKey } from '../../domain/localCalendar';

import { useState } from 'react';
import { useScreenState } from '../../app/useScreenState';
import { sessionCalendarDate } from '../../domain/trainingCalendar';

import { Link, useLoaderData, useNavigate } from 'react-router-dom';

import { CalendarDays, ChevronRight, Dumbbell, Layers, Plus } from 'lucide-react';

import { WeekSelector } from '../../components/home/WeekSelector';

import { WorkoutHero } from '../../components/home/WorkoutHero';

import { ActiveWorkoutCard } from '../../components/home/ActiveWorkoutCard';

import { WorkoutListItem } from '../../components/home/WorkoutListItem';

import { WeeklyProgress } from '../../components/home/WeeklyProgress';

import { InsightCard } from '../../components/home/InsightCard';

import { Recommendations } from '../../components/home/RecommendationCard';

import { SectionHeader } from '../../components/home/SectionHeader';

import { HomeSecondaryCards } from '../../components/home/SecondaryCards';

import { startPlannedWorkout } from '../workout/workoutService';

import {
  homeState,
  countLabel,
  programDayMetadata,
  workoutCompletion,
  type HomeData,
} from './homeData';

export function HomePage() {
  const data = useLoaderData<HomeData>();

  const [selection, setSelection] = useScreenState<string | null>('day', null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const selected = data.week.some(({ key }) => key === selection) ? selection! : data.today;

  const state = homeState(data, selected);

  const selectedWorkouts = data.weekHistory.filter(
    ({ session }) => sessionCalendarDate(session) === selected,
  );

  const completedToday = data.calendar.getCompletedSession(data.today);
  const upcoming = data.calendar.upcoming.slice(0, 1);

  const start = async () => {
    if (busy || selected !== data.today || completedToday || !data.suggestion) return;

    setBusy(true);
    setError(null);

    try {
      await navigate(`/workout/${await startPlannedWorkout(data.suggestion.day.id)}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Workout could not start. Your saved data is unchanged.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobilePage className="home-page grid gap-4" data-home-state={state}>
      {error ? (
        <p className="home-error" role="alert">
          {error} <Link to="/workout">Open workouts</Link>
        </p>
      ) : null}

      {data.active ? (
        <ActiveWorkoutCard workout={data.active} />
      ) : (
        <WorkoutHero
          data={
            selected === data.today
              ? data
              : { ...data, suggestion: data.calendar.getScheduledWorkout(selected) }
          }
          scheduled={state === 'scheduled'}
          isToday={selected === data.today}
          selectedDate={selected}
          busy={busy}
          start={() => void start()}
        />
      )}

      <section className="home-schedule ui-card" aria-labelledby="home-schedule-title">
        <div className="home-schedule-heading">
          <CalendarDays size={22} aria-hidden="true" />
          <h2 id="home-schedule-title">Weekly Schedule</h2>
          <Link to="/plan/calendar">
            This week <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <WeekSelector
          days={data.week}
          calendar={data.calendar}
          selected={selected}
          onSelect={setSelection}
          variant="detailed"
        />
      </section>

      {upcoming.map(({ entry, date }) => (
        <Link
          key={`${entry.day.id}-${date ?? 'undated'}`}
          className="home-next-workout ui-card ui-card-interactive"
          to={`/plan/${entry.day.programId}/days/${entry.day.id}`}
        >
          <span className="home-tile-icon">
            <Dumbbell size={26} aria-hidden="true" />
          </span>
          <span className="home-next-copy">
            <span className="home-kicker">Next workout</span>
            <strong>{entry.day.name}</strong>
          </span>
          <span className="home-next-arrow">
            <ChevronRight size={26} aria-hidden="true" />
          </span>
          <span className="home-next-meta">
            <CalendarDays size={17} aria-hidden="true" />
            {date
              ? dateFromKey(date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Next in program'}
            <span>·</span>
            {programDayMetadata(entry)}
          </span>
        </Link>
      ))}

      <div className="home-secondary-grid home-primary-actions">
        <Link
          className="home-small-card ui-card ui-card-interactive"
          to={data.activeProgramId ? `/plan/${data.activeProgramId}` : '/plan/new'}
        >
          <span className="home-tile-icon">
            <Layers size={22} aria-hidden="true" />
          </span>
          <h2>
            {data.activeProgramId ? 'Current Program' : 'Create Program'}
            <ChevronRight size={18} aria-hidden="true" />
          </h2>
          <span>
            {data.activeProgramId ? 'View and manage your program' : 'Build a plan for your goals'}
          </span>
        </Link>
        <Link className="home-small-card ui-card ui-card-interactive" to="/workout">
          <span className="home-tile-icon">
            <Plus size={22} aria-hidden="true" />
          </span>
          <h2>
            Create Workout
            <ChevronRight size={18} aria-hidden="true" />
          </h2>
          <span>Build a custom workout</span>
        </Link>
      </div>

      {selected === data.today ? (
        <section className="home-section">
          <SectionHeader title="Today" />
          {data.calendar.scheduledToday || (!data.calendar.dated && data.suggestion) ? (
            <WorkoutListItem
              title={(data.calendar.scheduledToday ?? data.suggestion)!.day.name}
              metadata={programDayMetadata((data.calendar.scheduledToday ?? data.suggestion)!)}
              completed={!!completedToday}
              status={
                completedToday
                  ? 'Completed today'
                  : data.calendar.dated
                    ? 'Scheduled today'
                    : 'Next in program'
              }
              to={
                completedToday
                  ? `/workout/${completedToday.id}?details=1`
                  : `/plan/${(data.calendar.scheduledToday ?? data.suggestion)!.day.programId}/days/${(data.calendar.scheduledToday ?? data.suggestion)!.day.id}`
              }
            />
          ) : completedToday ? (
            <WorkoutListItem
              title={completedToday.name ?? 'Workout'}
              metadata="Workout complete · Saved locally"
              status="Completed today"
              completed
              to={`/workout/${completedToday.id}?details=1`}
            />
          ) : (
            <p className="home-muted">
              {data.calendar.dated ? 'Rest Day' : 'No scheduled workout'}
            </p>
          )}
        </section>
      ) : null}

      {selected !== data.today ? (
        <section className="home-section">
          <SectionHeader
            title={data.week.find(({ key }) => key === selected)?.accessibleDate ?? 'Selected day'}
          />

          <p className="home-muted">
            {selectedWorkouts.length
              ? 'Completed workouts on this date'
              : data.calendar.getScheduledWorkout(selected)
                ? 'Scheduled workout on this date'
                : 'No workouts recorded for this date.'}
          </p>

          {selectedWorkouts.map((workout) => (
            <WorkoutListItem
              key={workout.session.id}
              title={workout.session.name ?? 'Workout'}
              metadata={countLabel(workoutCompletion(workout).completedSets, 'completed set')}
              completed
              to={`/workout/${workout.session.id}?details=1`}
            />
          ))}
        </section>
      ) : null}

      {/* Weekly progress is available across all home states */}
      <WeeklyProgress data={data} />

      {state === 'rest-day' ? (
        <>
          <section className="home-section">
            <SectionHeader title="Explore for Your Next Session" />
            <Recommendations />
          </section>

          <InsightCard data={data} />
        </>
      ) : (
        <HomeSecondaryCards data={data} />
      )}

      <Link className="home-quick-start" to="/workout">
        Want to train your own way? Start a Quick Workout
        <ChevronRight size={17} aria-hidden="true" />
      </Link>
    </MobilePage>
  );
}
