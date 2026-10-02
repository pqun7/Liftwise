import { number } from './format';
import {
  Activity,
  ArrowUpRight,
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
import { formatDuration } from '../../domain/workoutTime';
import type { progressLoader } from './loaders';
import {
  calendarDays,
  comparison,
  periodSummary,
  trainingDays,
  weekdayActivity,
} from './overviewAnalytics';
import {
  focus,
  MetricCard,
  ProgressHeader,
  progressLayout,
  RangeControl,
  surface,
} from './ProgressUI';

export function ProgressPage() {
  const { workouts, previous, range, start, now } =
    useLoaderData<Awaited<ReturnType<typeof progressLoader>>>();
  const current = periodSummary(workouts),
    before = periodSummary(previous);
  const activity = weekdayActivity(workouts),
    max = Math.max(1, ...activity);
  const days = trainingDays(workouts);
  const periodDays = calendarDays(start, now);
  const frequency = range === 'ALL' ? null : days / periodDays;
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
      value: formatDuration(current.duration),
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
    <MobilePage className={progressLayout}>
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
            trend={comparison(current[item.key], before[item.key])}
            caption={
              before[item.key] > 0
                ? `vs previous ${range === '7D' ? '7 days' : range === '1Y' ? 'year' : `${range.slice(0, -1)} months`}`
                : 'In this period'
            }
          />
        ))}
      </div>
      <Card padding="none" className="rounded-[16px] p-3">
        <h2 className="text-base font-bold">Weekly Activity</h2>
        <p className="text-xs text-secondary">Completed workouts by weekday · selected period</p>
        <svg
          className="mt-2 h-[90px] w-full overflow-visible"
          viewBox="0 0 330 112"
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
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <line
                x1="22"
                x2="328"
                y1={84 - i * 25}
                y2={84 - i * 25}
                stroke="var(--border-default)"
              />
              <text x="2" y={88 - i * 25} fill="var(--text-muted)" fontSize="10">
                {Math.round((max * i) / 3)}
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
                fontSize="11"
              >
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
              </text>
            </g>
          ))}
        </svg>
      </Card>
      <Card padding="none" className="flex items-center gap-3 rounded-[16px] p-3">
        <svg
          className="size-[60px] shrink-0 -rotate-90"
          viewBox="0 0 72 72"
          role="img"
          aria-label={`${days} training days`}
        >
          <circle cx="36" cy="36" r="28" fill="none" stroke="var(--surface-3)" strokeWidth="9" />
          <circle
            cx="36"
            cy="36"
            r="28"
            fill="none"
            stroke="var(--mint)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${(frequency ?? (days ? 1 : 0)) * 176} 176`}
          />
        </svg>
        <div>
          <h2 className="text-sm font-semibold">Training Days</h2>
          <p className="text-[26px] font-extrabold tabular-nums">{days}</p>
          <p className="text-xs text-secondary">
            {frequency === null
              ? 'Across completed history'
              : `${days} of ${periodDays} calendar days`}
          </p>
        </div>
        <Activity className="ml-auto text-mint" size={22} />
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
              className={`${surface} ${focus} flex min-h-[82px] items-center gap-2 p-2.5 no-underline transition-colors hover:border-mint/40 active:bg-surface-3`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-mint/10 text-mint">
                <Icon size={20} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[11px] leading-4 font-bold text-primary">{title}</h3>
                <p className="mt-1! text-[10px] leading-[1.4] text-secondary">{copy}</p>
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
      <Link
        className={`${focus} flex min-h-11 items-center gap-2 text-xs text-secondary`}
        to="/settings/data-safety"
      >
        Backup and restore <ArrowUpRight size={14} />
      </Link>
    </MobilePage>
  );
}
