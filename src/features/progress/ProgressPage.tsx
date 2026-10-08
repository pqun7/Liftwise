import { number } from './format';
import {
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  Clock,
  Dumbbell,
  Layers,
  UserRound,
  Trophy,
} from 'lucide-react';
import { Link, useLoaderData } from 'react-router-dom';
import { MobilePage } from '../../components/layout/MobilePage';
import { StreakCard } from './StreakCard';
import type { progressLoader } from './loaders';
import { periodSummary } from './overviewAnalytics';
import {
  focus,
  MetricCard,
  ProgressHeader,
  progressLayout,
  RangeControl,
  surface,
} from './ProgressUI';

export function ProgressPage() {
  const { workouts, range, streak } = useLoaderData<Awaited<ReturnType<typeof progressLoader>>>();
  const current = periodSummary(workouts);
  const items = [
    {
      icon: Dumbbell,
      label: 'Completed Workouts',
      value: number(current.workouts),
      key: 'workouts',
    },
    {
      icon: Clock,
      label: 'Training Time',
      value:
        current.duration >= 3600
          ? `${Math.floor(current.duration / 3600)}h ${Math.floor((current.duration % 3600) / 60)}m`
          : `${Math.floor(current.duration / 60)}m`,
      key: 'duration',
    },
    {
      icon: ChartNoAxesColumnIncreasing,
      label: 'Total Volume',
      value: `${number(current.volume)} kg`,
      key: 'volume',
    },
    { icon: Layers, label: 'Working Sets', value: number(current.sets), key: 'sets' },
  ] as const;
  return (
    <MobilePage className={`${progressLayout} progress-overview`}>
      <ProgressHeader
        overview
        title="Progress"
        description="Your training trends and key insights."
      />
      <RangeControl range={range} overview />
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <MetricCard
            key={item.key}
            icon={item.icon}
            label={item.label}
            value={item.value}
            caption="In this period"
          />
        ))}
      </div>
      <StreakCard streak={streak} />
      <section>
        <h2 className="mb-2! text-base font-bold">Explore Progress</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              title: 'Workout History',
              copy: 'View past workouts and track progress',
              icon: Dumbbell,
              to: '/progress/history',
            },
            {
              title: 'Exercise Insights',
              copy: 'Analyze individual exercise performance',
              icon: ChartNoAxesColumnIncreasing,
              to: '/progress/exercises',
            },
            {
              title: 'Body Measurements',
              copy: 'Track your body metrics over time',
              icon: UserRound,
              to: '/progress/measurements',
            },
            {
              title: 'Personal Records',
              copy: 'See your all-time bests across exercises',
              icon: Trophy,
              to: '/progress/exercises?records=1',
            },
          ].map(({ title, copy, icon: Icon, to }) => (
            <Link
              key={to}
              to={to}
              className={`${surface} ${focus} progress-explore-link relative grid min-h-[82px] content-start gap-3 p-4 no-underline transition-colors hover:border-mint/20 active:bg-surface-3`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mint/10 text-mint">
                <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="type-body font-semibold text-primary">{title}</h3>
                <p className="mt-1! type-caption text-secondary">{copy}</p>
              </div>
              <ChevronRight
                size={16}
                className="absolute top-5 right-4 text-muted"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>
      {!workouts.length && (
        <p className="text-xs text-secondary">
          No completed workouts in this period. Your progress will appear here after training.
        </p>
      )}
    </MobilePage>
  );
}
