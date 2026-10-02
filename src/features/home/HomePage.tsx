import { MobilePage } from '../../components/layout/MobilePage';

import { useEffect, useState } from 'react';

import { Link, useLoaderData, useNavigate, useRevalidator } from 'react-router-dom';

import { ChevronRight } from 'lucide-react';

import { HomeHeader } from '../../components/home/HomeHeader';

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
  localDateKey,
  programDayMetadata,
  workoutCompletion,
  type HomeData,
} from './homeData';

export function HomePage() {
  const data = useLoaderData<HomeData>();

  const [selection, setSelection] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { revalidate } = useRevalidator();

  const selected = data.week.some(({ key }) => key === selection) ? selection! : data.today;

  const state = homeState(data, selected);

  const selectedWorkouts = data.weekHistory.filter(
    ({ session }) => localDateKey(new Date(session.endedAt ?? session.startedAt)) === selected,
  );

  const upcoming = data.nextDays
    .filter(({ day }) => day.id !== data.active?.session.programDayId)
    .slice(0, 2);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void revalidate();
      }
    };

    document.addEventListener('visibilitychange', refresh);

    const midnightCheck = window.setInterval(() => {
      if (localDateKey(new Date()) !== data.today) {
        refresh();
      }
    }, 60_000);

    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(midnightCheck);
    };
  }, [data.today, revalidate]);

  const start = async () => {
    if (busy || !data.suggestion) return;

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
      <HomeHeader greeting={data.greeting} active={state === 'in-progress'} />

      {state !== 'in-progress' ? (
        <WeekSelector days={data.week} selected={selected} onSelect={setSelection} />
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
          data={data}
          scheduled={state === 'scheduled'}
          isToday={selected === data.today}
          busy={busy}
          start={() => void start()}
        />
      )}

      {data.active ? (
        <section className="home-section">
          <SectionHeader title="Today" />

          <WorkoutListItem
            title={data.active.session.name ?? 'Quick Workout'}
            metadata={`${countLabel(data.active.exercises.length, 'exercise')} · ${countLabel(
              workoutCompletion(data.active).totalSets,
              'set',
            )}`}
            status={data.active.session.status === 'paused' ? 'Paused' : 'In progress'}
            to={`/workout/${data.active.session.id}`}
          />
        </section>
      ) : null}

      {state === 'scheduled' ? <QuickActions /> : null}

      {state === 'in-progress' && upcoming.length ? (
        <section className="home-section">
          <SectionHeader title="Up next" to="/plan" />

          {upcoming.map((entry) => (
            <WorkoutListItem
              key={entry.day.id}
              title={entry.day.name}
              metadata={programDayMetadata(entry)}
              to={`/plan/${entry.day.programId}/days/${entry.day.id}`}
              status="Program order"
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
            <div className="home-surface home-empty">
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
              : 'No workouts recorded or scheduled for this date.'}
          </p>

          {selectedWorkouts.map((workout) => (
            <WorkoutListItem
              key={workout.session.id}
              title={workout.session.name ?? 'Workout'}
              metadata={countLabel(workoutCompletion(workout).completedSets, 'completed set')}
              completed
              to={`/workout/${workout.session.id}`}
            />
          ))}
        </section>
      ) : null}

      {/* Weekly progress is available across all home states */}
      <WeeklyProgress data={data} />

      {state === 'in-progress' ? (
        <WeekSelector days={data.week} selected={selected} onSelect={setSelection} />
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
