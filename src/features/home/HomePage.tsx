import { MobilePage } from '../../components/layout/MobilePage';
import { dateFromKey } from '../../domain/localCalendar';

import { useState } from 'react';
import { useScreenState } from '../../app/useScreenState';
import { sessionCalendarDate } from '../../domain/trainingCalendar';

import { Link, useLoaderData, useNavigate } from 'react-router-dom';

import { ChevronRight } from 'lucide-react';

import { WeekSelector } from '../../components/home/WeekSelector';

import { WorkoutHero } from '../../components/home/WorkoutHero';

import { ActiveWorkoutCard } from '../../components/home/ActiveWorkoutCard';

import { WorkoutListItem } from '../../components/home/WorkoutListItem';

import { QuickActions } from '../../components/home/QuickActionCard';

import { WeeklyProgress } from '../../components/home/WeeklyProgress';

import { InsightCard } from '../../components/home/InsightCard';

import { ProgramCard } from '../../components/home/ProgramCard';

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
  const upcoming = data.calendar.upcoming.slice(0, 2);

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
      <p className="type-body-small text-secondary">{data.greeting}</p>

      {state !== 'in-progress' ? (
        <WeekSelector
          days={data.week}
          calendar={data.calendar}
          selected={selected}
          onSelect={setSelection}
        />
      ) : null}

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

      {state === 'scheduled' ? <QuickActions /> : null}

      {upcoming.length ? (
        <section className="home-section">
          <SectionHeader title="Up next" to="/plan" />

          {upcoming.map(({ entry, date }) => (
            <WorkoutListItem
              key={`${entry.day.id}-${date ?? 'undated'}`}
              title={entry.day.name}
              metadata={programDayMetadata(entry)}
              to={`/plan/${entry.day.programId}/days/${entry.day.id}`}
              status={
                date
                  ? dateFromKey(date).toLocaleDateString(undefined, { weekday: 'long' })
                  : 'Program order'
              }
            />
          ))}
        </section>
      ) : null}

      {state === 'rest-day' ? (
        <section className="home-section">
          <SectionHeader title="Your Programs" to="/plan" />

          {data.programs.length ? (
            data.programs
              .slice(0, 2)
              .map((graph) => (
                <ProgramCard
                  key={graph.program.id}
                  graph={graph}
                  active={graph.program.id === data.activeProgramId}
                />
              ))
          ) : (
            <div className="home-surface ui-card home-empty">
              <p>A clear plan starts here.</p>

              <Link to="/plan/new">
                Create your first program
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </div>
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

      {state === 'in-progress' ? (
        <WeekSelector
          days={data.week}
          calendar={data.calendar}
          selected={selected}
          onSelect={setSelection}
        />
      ) : null}

      {state === 'scheduled' ? <InsightCard data={data} /> : null}
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
