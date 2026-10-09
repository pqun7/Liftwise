import { ContextBackLink } from '../../components/ContextBackLink';
import { ActiveWorkoutLogger } from './ActiveWorkoutLogger';
import { useScreenState } from '../../app/useScreenState';
import { WorkoutSummary } from './WorkoutSummary';
import { MobilePage } from '../../components/layout/MobilePage';
import { Textarea } from '../../components/ui/FormControl';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useBlocker, useLoaderData, useNavigate, useRevalidator } from 'react-router-dom';
import { WorkoutSaveContext } from './WorkoutSaveContext';
import { WorkoutSaveQueue } from './workoutSaveQueue';
import { Button } from '../../components/ui/Button';

import type { SetCompletionUndo } from '../../lib/storage/repositories/workoutRepository';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import { WorkoutElapsed } from './WorkoutClock';
import {
  addWorkoutSet,
  removeWorkoutExercise,
  reorderWorkoutExercises,
  setCurrentWorkoutExercise,
  skipWorkoutExercise,
  undoWorkoutCompletion,
  pauseWorkoutForDeparture,
  type HydratedWorkoutGraph,
} from './workoutService';

export function WorkoutSessionPage() {
  const { workout } = useLoaderData<{ workout: HydratedWorkoutGraph }>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [saves] = useState(() => new WorkoutSaveQueue());
  useSyncExternalStore(saves.subscribe, saves.snapshot);
  const blocker = useBlocker(({ nextLocation }) => {
    if (saves.departureCommitted) return false;
    const continuing =
      nextLocation.pathname.startsWith(`/workout/${workout.session.id}`) ||
      nextLocation.pathname.startsWith('/exercises/');
    return saves.unsettled || (workout.session.status === 'active' && !continuing);
  });
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const operationInFlight = useRef(false);
  const [undo, setUndo] = useScreenState<SetCompletionUndo | null>('undo', null);
  const [collapsed, setCollapsed] = useScreenState<Set<string>>('collapsed', () => new Set());
  const [showOverview, setShowOverview] = useScreenState('overview', false);
  const [pageError, setPageError] = useState<string | null>(null);
  const leavingFor = useRef<string | null>(null);
  const refresh = async () => {
    await revalidator.revalidate();
  };
  useEffect(() => {
    if (blocker.state !== 'blocked') {
      leavingFor.current = null;
      return;
    }
    if (leavingFor.current === blocker.location.key) return;
    leavingFor.current = blocker.location.key;
    void saves
      .flush()
      .then(async () => {
        const destination = blocker.location?.pathname ?? '';
        const continuing =
          destination.startsWith(`/workout/${workout.session.id}`) ||
          destination.startsWith('/exercises/');
        if (workout.session.status === 'active' && !continuing)
          await pauseWorkoutForDeparture(workout.session.id);
        blocker.proceed();
      })
      .catch(() => {
        leavingFor.current = null;
        blocker.reset();
        setPageError('Save your changes before leaving. Retry the save below.');
      });
  }, [blocker, saves, workout.session.id, workout.session.status]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (saves.unsettled) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const onVisible = () => {
      setNow(Date.now());
      if (document.visibilityState === 'visible' && !saves.unsettled) void revalidator.revalidate();
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [saves, revalidator]);
  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, undo.expiresAt - Date.now() + 1),
    );
    return () => window.clearTimeout(timer);
  }, [undo]);
  const run = async (action: () => Promise<unknown>) => {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setBusy(true);
    setPageError(null);
    try {
      await saves.perform(async () => {
        await action();
        await refresh();
      });
    } catch (nextError) {
      setPageError(
        nextError instanceof Error ? nextError.message : 'The change could not be saved.',
      );
    } finally {
      operationInFlight.current = false;
      setBusy(false);
    }
  };
  const session = workout.session;
  const previousStatus = useRef(session.status);
  useEffect(() => {
    if (session.status === 'completed' && previousStatus.current !== 'completed')
      window.scrollTo({ top: 0, behavior: 'instant' });
    previousStatus.current = session.status;
  }, [session.status]);
  const mutable = session.status === 'active' || session.status === 'paused';
  const closedDrafts =
    !mutable && saves.error ? (
      <div role="alert" className="grid gap-2 rounded-xl border border-danger p-3 text-sm">
        <p>
          This workout has ended. Your unsaved edits cannot change the saved record. Copy any values
          you need before leaving.
        </p>
        {workout.exercises.flatMap(({ exercise, sets }) =>
          sets.flatMap((set) => {
            const draft = saves.drafts.get(set.id)?.value;
            return draft ? (
              <p key={set.id}>
                {exercise.exerciseName} · Set {set.setNumber}: {draft.weight || '—'} kg ·{' '}
                {draft.reps || '—'} reps · RIR {draft.rir || '—'}
              </p>
            ) : (
              []
            );
          }),
        )}
        {saves.notesDraft !== undefined ? <p>Unsaved notes: {saves.notesDraft}</p> : null}
        <Button
          onClick={() => {
            if (
              !window.confirm(
                'Leave without these unsaved edits? The finished workout record stays saved.',
              )
            )
              return;
            saves.departureCommitted = true;
            void Promise.resolve(navigate('/workout')).finally(() => {
              saves.departureCommitted = false;
            });
          }}
        >
          Leave without unsaved edits
        </Button>
      </div>
    ) : null;

  const overview = (
    <div className="grid gap-4">
      {workout.exercises.map((entry, index) => (
        <WorkoutExerciseCard
          key={entry.exercise.id}
          entry={entry}
          sessionId={session.id}
          mutable={mutable && !busy && session.status !== 'paused'}
          current={session.currentExerciseId === entry.exercise.id}
          hidden={collapsed.has(entry.exercise.id)}
          busy={busy}
          canMoveUp={index > 0}
          canMoveDown={index < workout.exercises.length - 1}
          refresh={refresh}
          onCompleted={setUndo}
          onCurrent={() =>
            void run(async () => {
              await setCurrentWorkoutExercise(session.id, entry.exercise.id);
              setShowOverview(false);
            })
          }
          onCollapse={() =>
            setCollapsed((current) => {
              const changed = new Set(current);
              if (changed.has(entry.exercise.id)) changed.delete(entry.exercise.id);
              else changed.add(entry.exercise.id);
              return changed;
            })
          }
          onSkip={() =>
            void run(() => skipWorkoutExercise(entry.exercise.id, !entry.exercise.skipped))
          }
          onAddSet={() => void run(() => addWorkoutSet(entry.exercise.id))}
          onMove={(direction) => {
            const ids = workout.exercises.map(({ exercise }) => exercise.id);
            const target = index + direction;
            [ids[index], ids[target]] = [ids[target]!, ids[index]!];
            void run(() => reorderWorkoutExercises(session.id, ids));
          }}
          onRemove={() => {
            if (window.confirm(`Remove ${entry.exercise.exerciseName} from this workout?`))
              void run(() => removeWorkoutExercise(entry.exercise.id));
          }}
        />
      ))}
    </div>
  );
  if (mutable)
    return (
      <WorkoutSaveContext.Provider value={saves}>
        {saves.error ? (
          <div role="alert" className="rounded-xl border border-danger p-3 text-sm text-danger">
            {saves.error}
            <Button
              disabled={busy || saves.pending > 0}
              onClick={() =>
                void saves
                  .retry()
                  .then(refresh)
                  .then(() => setPageError(null))
                  .catch((failure: Error) => setPageError(failure.message))
              }
            >
              Retry save
            </Button>
          </div>
        ) : null}
        <ActiveWorkoutLogger
          workout={workout}
          now={now}
          busy={busy}
          run={run}
          refresh={refresh}
          onCompleted={setUndo}
          undo={undo}
          error={pageError}
          overview={overview}
          showOverview={showOverview}
          setShowOverview={setShowOverview}
          onUndo={() => {
            if (undo)
              void run(async () => {
                await undoWorkoutCompletion(undo);
                const entry = workout.exercises.find((item) =>
                  item.sets.some((set) => set.id === undo.setId),
                );
                if (entry) await setCurrentWorkoutExercise(session.id, entry.exercise.id);
                setUndo(null);
              });
          }}
        />
      </WorkoutSaveContext.Provider>
    );

  if (session.status === 'completed')
    return (
      <div className="grid gap-3">
        {closedDrafts}
        <WorkoutSummary
          workout={workout}
          onUndo={
            undo && now <= undo.expiresAt
              ? () => {
                  void run(async () => {
                    await undoWorkoutCompletion(undo);
                    setUndo(null);
                  });
                }
              : undefined
          }
        />
      </div>
    );

  return (
    <MobilePage className="grid gap-4" aria-labelledby="session-title">
      {closedDrafts}
      <ContextBackLink fallback="/workout" label="Workouts" />
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-mint">{session.status} · saved locally</p>
          <h1 id="session-title" className="type-page-title">
            {session.name ?? 'Quick Workout'}
          </h1>
        </div>
        <strong aria-label="Elapsed workout time">
          <WorkoutElapsed session={session} />
        </strong>
      </header>
      {pageError ? (
        <p role="alert" className="text-danger">
          {pageError}
        </p>
      ) : null}
      <label className="grid gap-2 text-sm">
        <span>Workout notes</span>
        <Textarea value={session.notes ?? ''} disabled />
      </label>
      {overview}
      {workout.exercises.length === 0 ? <p>No exercises recorded.</p> : null}
    </MobilePage>
  );
}
