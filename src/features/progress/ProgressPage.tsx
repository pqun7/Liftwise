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
import { Card } from '../../components/ui/Card';
import { StreakCard } from './StreakCard';
import type { progressLoader } from './loaders';
import { periodSummary, weekdayActivity } from './overviewAnalytics';
import {
  focus,
  MetricCard,
  ProgressHeader,
  progressLayout,
  RangeControl,
  surface,
} from './ProgressUI';

export function ProgressPage() {
  const { workouts, range, streak, now } =
    useLoaderData<Awaited<ReturnType<typeof progressLoader>>>();
  const current = periodSummary(workouts);
  const activity = weekdayActivity(workouts, new Date(now)),
    step = Math.max(1, Math.ceil(Math.max(...activity) / 2)),
    max = step * 2;
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
      <Card padding="none" className="progress-activity">
        <Link to="/progress/history" className="progress-activity-heading">
          <div>
            <h2 className="text-base font-bold">Weekly Activity</h2>
            <p className="text-xs text-secondary">
              Completed workouts by weekday · selected period
            </p>
          </div>
          <ChevronRight size={19} aria-hidden="true" />
        </Link>
        <svg
          className="mt-2 h-[90px] w-full overflow-visible"
          viewBox="0 0 330 112"
          preserveAspectRatio="none"
          role="img"
          aria-label={activity
            .map(
              (n, i) =>
                `${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]}: ${n} workouts`,
            )
            .join(', ')}
        >
          <defs>
            <linearGradient id="activity-mint" x2="0" y2="1">
              <stop stopColor="var(--mint)" />
              <stop offset="1" stopColor="var(--mint)" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <line
                x1="22"
                x2="328"
                y1={84 - i * 37.5}
                y2={84 - i * 37.5}
                stroke="var(--border-default)"
              />
              <text x="2" y={88 - i * 37.5} fill="var(--text-muted)" fontSize="12">
                {step * i}
              </text>
            </g>
          ))}
          {activity.map((count, i) => (
            <g key={i}>
              <rect
                x={31 + i * 43}
                y={84 - (count / max) * 75}
                width="22"
                height={(count / max) * 75}
                rx="4"
                fill="url(#activity-mint)"
              />
              <text
                x={42 + i * 43}
                y="105"
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="12"
              >
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
              </text>
            </g>
          ))}
        </svg>
      </Card>
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
              className={`${surface} ${focus} progress-explore-link flex min-h-[82px] items-center gap-2 p-2.5 no-underline transition-colors hover:border-mint/40 active:bg-surface-3`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mint/10 text-mint">
                <Icon size={20} />
              </span>
              <div className="min-w-0">
                <h3 className="type-body font-semibold text-primary">{title}</h3>
                <p className="mt-1! type-caption text-secondary">{copy}</p>
              </div>
              <ChevronRight size={14} className="ml-auto shrink-0 text-secondary" />
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
