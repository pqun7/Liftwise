import { IconButton } from '../../components/ui/IconButton';
import { Button } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/controlStyles';
import { Card } from '../../components/ui/Card';
import { useRef, useState } from 'react';
import { Link, useLoaderData, useRevalidator, useSearchParams } from 'react-router-dom';
import {
  Plus,
  GripVertical,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  BedDouble,
  Dumbbell,
  ChevronLeft,
  FileText,
} from 'lucide-react';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { ExerciseImage } from '../exercises/ExerciseImage';
import {
  deletePrescription,
  movePrescription,
  updateProgramDay,
  type HydratedProgramDay,
} from './programService';
import { formatPrescription, formatRest } from './prescriptionFormat';
import { BuilderHeader, BuilderFooter, NextLabel } from './BuilderChrome';
import { estimatedProgramMinutes } from './programDisplay';
import { UnsavedChanges } from './UnsavedChanges';
import { reviewDestination, reviewSuffix } from './reviewNavigation';
import recoveryArtwork from '../../assets/images/plan/recovery-transparent.png';

export function ProgramDayPage() {
  const { day: data } = useLoaderData<{ day: HydratedProgramDay }>();
  return <ProgramDayEditor key={data.day.id} />;
}

function ProgramDayEditor() {
  const { day: data, graph } = useLoaderData<{ day: HydratedProgramDay; graph: ProgramGraph }>();
  const revalidator = useRevalidator();
  const [params] = useSearchParams();
  const suffix = reviewSuffix(params);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [note, setNote] = useState(data.day.notes ?? '');
  const [noteSaved, setNoteSaved] = useState(data.day.notes ?? '');
  const pending = useRef(false);
  const base = `/plan/${data.program.id}`;
  const index = graph.days.findIndex(({ day }) => day.id === data.day.id);
  const previous = graph.days[index - 1];
  const next = graph.days[index + 1];
  const upNext = graph.days.slice(index + 1).find(({ day }) => day.kind !== 'recovery');
  const minutes = estimatedProgramMinutes(data.exercises.map(({ prescription }) => prescription));
  const recovery = data.day.kind === 'recovery';
  const run = async (action: () => Promise<unknown>) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      await revalidator.revalidate();
      return true;
    } catch {
      setError('The change could not be saved. Your existing program is unchanged. Try again.');
      return false;
    } finally {
      setBusy(false);
      pending.current = false;
    }
  };
  return (
    <section className="builder-page" aria-label={`${data.day.name} exercise management`}>
      <UnsavedChanges
        dirty={note !== noteSaved}
        saving={busy}
        onDiscard={() => setNote(noteSaved)}
      />
      <BuilderHeader
        title={data.program.draft ? 'Create Program' : 'Edit Program'}
        step={3}
        programId={data.program.id}
        back={`${base}/build/days`}
        exercisesPath={`${base}/days/${data.day.id}`}
      />
      <nav className="exercise-day-navigation" aria-label="Program days">
        {previous ? (
          <Link aria-label="Previous day" to={`${base}/days/${previous.day.id}${suffix}`}>
            <ChevronLeft />
          </Link>
        ) : (
          <span />
        )}
        <strong>
          Day {index + 1} of {graph.days.length}
        </strong>
        {next ? (
          <Link aria-label="Next day" to={`${base}/days/${next.day.id}${suffix}`}>
            <ChevronRight />
          </Link>
        ) : (
          <span />
        )}
      </nav>
      <h2
        className={`flex items-center gap-3 type-page-title ${recovery ? 'justify-center py-2' : ''}`}
      >
        {recovery ? (
          <>
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-mint/25 bg-mint/10">
              <BedDouble size={26} aria-hidden="true" />
            </span>{' '}
            Recovery Day
          </>
        ) : (
          data.day.name
        )}
      </h2>
      {!recovery ? (
        <p className="text-secondary">
          {data.exercises.length} exercises{minutes == null ? '' : ` · ~${minutes} min`}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      {recovery ? (
        <section className="grid justify-items-center gap-5 text-center">
          <img
            className="recovery-artwork mx-auto block h-auto w-[310px] max-w-full object-contain"
            src={recoveryArtwork}
            width={1448}
            height={1086}
            alt=""
            decoding="async"
          />
          <h2 className="type-page-title">Take the day off</h2>
          <p className="max-w-[310px] text-[16px] leading-relaxed text-secondary">
            Rest and recover as part of your training cycle. This helps you build strength, prevent
            injury, and perform better in the days ahead.
          </p>
          {upNext ? (
            <Card variant="glass" className="recovery-up-next grid w-full gap-3 text-left">
              <small className="type-label tracking-wider text-mint">UP NEXT</small>
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-border bg-surface-2 text-sky-400">
                  <Dumbbell size={27} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="type-card-title">
                    Day {graph.days.indexOf(upNext) + 1} · {upNext.day.name}
                  </strong>
                  <p className="type-body-small text-secondary">
                    {upNext.exercises.length} exercises
                    {estimatedProgramMinutes(upNext.exercises) == null
                      ? ''
                      : ` · ~${estimatedProgramMinutes(upNext.exercises)} min`}
                  </p>
                </div>
                <Link
                  className={buttonClasses('outline', 'text-sm')}
                  to={`${base}/days/${upNext.day.id}${suffix}`}
                >
                  View Day {graph.days.indexOf(upNext) + 1}
                  <ChevronRight size={16} />
                </Link>
              </div>
            </Card>
          ) : (
            <p>Your cycle continues with Day 1.</p>
          )}
        </section>
      ) : (
        <>
          <div className="builder-exercises">
            {data.exercises.map(({ prescription, exercise }, index) => (
              <Card as="article" key={prescription.id} padding="none" className="builder-exercise">
                <div className="builder-exercise-row">
                  <IconButton
                    className="rounded-xl"
                    type="button"
                    aria-label={`Reorder ${exercise.name}`}
                    aria-expanded={expanded === prescription.id}
                    onClick={() =>
                      setExpanded((current) =>
                        current === prescription.id ? null : prescription.id,
                      )
                    }
                  >
                    <GripVertical size={19} aria-hidden="true" />
                  </IconButton>
                  <Link
                    className="builder-exercise-main"
                    to={`${base}/days/${data.day.id}/exercises/${prescription.id}/edit${suffix}`}
                  >
                    <ExerciseImage
                      key={exercise.id}
                      image={exercise.images.start ?? exercise.images.main ?? null}
                      className="builder-exercise-image"
                    />
                    <div>
                      <h2>{exercise.name}</h2>
                      <p>
                        {formatPrescription(prescription)} · {formatRest(prescription.restSeconds)}
                      </p>
                    </div>
                    <ChevronRight size={19} aria-hidden="true" />
                  </Link>
                </div>
                {expanded === prescription.id ? (
                  <div className="builder-row-actions" aria-label={`${exercise.name} actions`}>
                    <Button
                      type="button"
                      disabled={busy || index === 0}
                      aria-label={`Move ${exercise.name} up`}
                      onClick={() =>
                        void run(() => movePrescription(data.day.id, prescription.id, -1))
                      }
                    >
                      <ArrowUp size={17} aria-hidden="true" />
                      Up
                    </Button>
                    <Button
                      type="button"
                      disabled={busy || index === data.exercises.length - 1}
                      aria-label={`Move ${exercise.name} down`}
                      onClick={() =>
                        void run(() => movePrescription(data.day.id, prescription.id, 1))
                      }
                    >
                      <ArrowDown size={17} aria-hidden="true" />
                      Down
                    </Button>
                    <Button
                      type="button"
                      className="danger-text"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Remove ${exercise.name} from this day?`))
                          void run(() => deletePrescription(prescription.id));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : null}
                <p className="builder-exercise-rest">{formatRest(prescription.restSeconds)}</p>
              </Card>
            ))}
          </div>
          {!data.exercises.length ? (
            <div className="builder-empty">
              <Plus size={30} />
              <h3>No exercises yet</h3>
              <p>Choose the exercises you want to perform on this workout day.</p>
            </div>
          ) : null}
          <Link className="builder-add" to={`${base}/days/${data.day.id}/exercises${suffix}`}>
            <Plus size={21} aria-hidden="true" />
            Add exercise
          </Link>
          <details className="day-note">
            <summary>
              <FileText size={20} />
              {data.day.notes ? 'Edit day note' : 'Add day note'}
            </summary>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => updateProgramDay(data.day.id, { notes: note.trim() || null })).then(
                  (ok) => {
                    if (ok) {
                      setNote(note.trim());
                      setNoteSaved(note.trim());
                    }
                  },
                );
              }}
            >
              <textarea
                name="notes"
                aria-label="Day note"
                maxLength={4000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <Button type="submit" disabled={busy}>
                Save note
              </Button>
              {note === noteSaved && noteSaved ? <p role="status">Note saved</p> : null}
            </form>
          </details>
        </>
      )}
      <BuilderFooter>
        <div className="exercise-footer-actions">
          <Link
            className={buttonClasses('ghost')}
            to={previous ? `${base}/days/${previous.day.id}` : `${base}/build/days`}
          >
            <ChevronLeft size={18} />
            Previous
          </Link>
          <Link
            className={buttonClasses('primary')}
            to={
              suffix
                ? reviewDestination(base, params)
                : next
                  ? `${base}/days/${next.day.id}`
                  : `${base}/build/review`
            }
          >
            <NextLabel>
              {suffix ? 'Return to Review' : next ? `Next: Day ${index + 2}` : 'Review Program'}
            </NextLabel>
          </Link>
        </div>
      </BuilderFooter>
    </section>
  );
}
