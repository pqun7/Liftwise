import { Check, ChevronRight, Clock3, Dumbbell, FileText, Layers3, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { workout as defaultWorkout, type WorkoutCompleteData } from './workoutCompleteData';

const surface = 'ui-card ui-card-hero';
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mint';

function SuccessHero({
  completedSets,
  totalSets,
}: Pick<WorkoutCompleteData, 'completedSets' | 'totalSets'>) {
  return (
    <header className="completion-hero text-center">
      <div
        className="completion-emblem mx-auto mb-6 flex size-[76px] items-center justify-center rounded-full bg-mint text-accent-foreground"
        aria-hidden="true"
      >
        <Check size={36} strokeWidth={3} />
      </div>
      <div className="completion-enter">
        <h1
          id="session-title"
          className="text-[32px] leading-[1.12] font-extrabold tracking-[-0.045em] min-[390px]:text-[34px]"
        >
          Workout complete
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-secondary">
          Great work. You completed {completedSets === totalSets && totalSets > 0 ? 'all ' : ''}
          <strong className="font-semibold text-mint">{completedSets} sets</strong>.
        </p>
      </div>
    </header>
  );
}

function WorkoutSummaryCard({ workout }: { workout: WorkoutCompleteData }) {
  return (
    <section
      className={`${surface} completion-identity flex min-h-[88px] items-center gap-4 p-4`}
      aria-label="Completed workout"
    >
      <span className="ui-icon-container">
        <Dumbbell size={24} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="text-[22px] leading-tight font-bold tracking-[-0.025em] wrap-anywhere">
          {workout.name}
        </h2>
        <p className="mt-1.5 text-[13px] leading-5 text-secondary">
          {workout.exercises} exercises · {workout.completedSets} sets · {workout.duration} min
        </p>
      </div>
    </section>
  );
}

function PrimaryStatCard({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: number;
  unit: string;
  icon: LucideIcon;
}) {
  return (
    <div className={`${surface} min-w-0 px-4 py-[18px]`}>
      <dt className="flex flex-col gap-3">
        <Icon size={20} strokeWidth={1.7} className="text-mint" aria-hidden="true" />
        <span className="text-[11px] leading-4 font-semibold tracking-[0.09em] text-secondary uppercase">
          {label}
        </span>
      </dt>
      <dd className="mt-2 flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
        <span className="text-[30px] leading-none font-bold tracking-[-0.04em] min-[390px]:text-[32px]">
          {value.toLocaleString('en-US', { maximumFractionDigits: 1 })}
        </span>
        <span className="text-[14px] font-medium text-secondary">{unit}</span>
      </dd>
    </div>
  );
}

function MiniStatCard({
  label,
  value,
  icon: Icon,
  complete = false,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  complete?: boolean;
}) {
  return (
    <div className="ui-card ui-card-subtle relative overflow-hidden px-2.5 py-3.5">
      <dt className="flex flex-col gap-2">
        <Icon size={16} strokeWidth={1.7} className="text-muted" aria-hidden="true" />
        <span className="min-h-8 text-[12px] leading-4 font-medium text-secondary">{label}</span>
      </dt>
      <dd className="mt-1 text-[22px] leading-7 font-bold tracking-[-0.035em] tabular-nums min-[390px]:text-[24px]">
        {value}
      </dd>
      {complete ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-mint/60"
        />
      ) : null}
    </div>
  );
}

export function WorkoutComplete({
  workout = defaultWorkout,
  onDone,
  onViewDetails,
  onUndo,
}: {
  workout?: WorkoutCompleteData;
  onDone: () => void;
  onViewDetails: () => void;
  onUndo?: (() => void) | undefined;
}) {
  const primaryStats = [
    { label: 'Total volume', value: workout.totalVolume, unit: 'kg', icon: Dumbbell },
    { label: 'Duration', value: workout.duration, unit: 'min', icon: Clock3 },
  ];
  const secondaryStats = [
    { label: 'Exercises', value: workout.exercises, icon: Dumbbell },
    {
      label: 'Completed sets',
      value: `${workout.completedSets} / ${workout.totalSets}`,
      icon: Layers3,
      complete: workout.totalSets > 0 && workout.completedSets === workout.totalSets,
    },
    {
      label: 'Avg. RIR',
      value: workout.rir === null ? '–' : workout.rir.toFixed(1),
      icon: Activity,
    },
  ];
  return (
    <section
      className="workout-complete relative isolate mx-auto w-full max-w-[440px] pb-2 font-sans text-primary"
      aria-labelledby="session-title"
    >
      <SuccessHero completedSets={workout.completedSets} totalSets={workout.totalSets} />
      <div className="completion-content completion-enter mt-7 grid gap-3">
        <WorkoutSummaryCard workout={workout} />
        <dl className="grid grid-cols-2 gap-3" aria-label="Primary workout metrics">
          {primaryStats.map((stat) => (
            <PrimaryStatCard key={stat.label} {...stat} />
          ))}
        </dl>
        <dl className="grid grid-cols-3 gap-2" aria-label="Supporting workout metrics">
          {secondaryStats.map((stat) => (
            <MiniStatCard key={stat.label} {...stat} />
          ))}
        </dl>
      </div>
      <div className="completion-actions completion-enter mt-6 grid gap-3">
        <Button
          type="button"
          variant="primary"
          size="large"
          onClick={onDone}
          className="completion-done w-full shadow-[var(--shadow-cta)]"
        >
          Done
        </Button>
        <Button
          type="button"
          onClick={onViewDetails}
          className="group min-h-[56px] w-full gap-3 rounded-[var(--radius-button)] text-[14px]"
        >
          <FileText
            size={19}
            strokeWidth={1.7}
            className="shrink-0 text-muted"
            aria-hidden="true"
          />
          <span className="flex-1 text-left">View Workout Details</span>
          <ChevronRight
            size={18}
            className="completion-chevron shrink-0 text-muted"
            aria-hidden="true"
          />
        </Button>
        {onUndo ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onUndo}
            className={`${focus} min-h-11 rounded-xl text-[13px] font-medium text-secondary transition-colors hover:text-white`}
          >
            Undo completion
          </Button>
        ) : null}
      </div>
    </section>
  );
}
