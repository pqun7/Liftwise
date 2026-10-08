import type { ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ContextBackLink } from '../../components/ContextBackLink';
import { ContextToolbar } from '../../components/layout/ContextToolbar';
import { Card } from '../../components/ui/Card';
import type { DateRange } from '../../domain/analytics';

export const progressLayout = 'progress-page grid gap-3 [&_h1]:m-0 [&_h2]:m-0 [&_h3]:m-0 [&_p]:m-0';
export const surface = 'ui-card';
export const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mint';
export function ProgressHeader({
  title,
  description,
  overview = false,
}: {
  title: string;
  description: string;
  overview?: boolean;
}) {
  return (
    <div className="grid gap-3">
      {!overview ? (
        <ContextToolbar
          title={title}
          back={<ContextBackLink fallback="/progress" label="Back to Progress" iconOnly />}
        />
      ) : null}
      <p className="type-body text-secondary">{description}</p>
    </div>
  );
}
export function RangeControl({
  range,
  overview = false,
}: {
  range: DateRange;
  overview?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const options: DateRange[] = overview
    ? ['7D', '1M', '3M', '6M', '1Y']
    : ['1M', '3M', '6M', '1Y', 'ALL'];
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="sr-only">Date range</legend>
      <div className={`${surface} flex p-0.5`}>
        {options.map((option) => (
          <label
            key={option}
            className={`relative flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full text-sm font-semibold transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-mint ${range === option ? 'bg-mint text-app' : 'text-secondary'}`}
          >
            <input
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              type="radio"
              name="Date range"
              aria-label={option}
              checked={range === option}
              onChange={() => {
                const next = new URLSearchParams(params);
                next.set('range', option);
                void setParams(next);
              }}
            />
            {option === 'ALL' ? 'All' : option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export function MetricCard({
  icon: Icon,
  label,
  value,
  caption,
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  caption?: string;
  trend?: string | null;
}) {
  return (
    <Card className="grid content-start gap-2">
      <div className="grid gap-3">
        <Icon size={20} strokeWidth={1.7} className="text-mint" aria-hidden="true" />
        <h2 className="type-stat-label text-secondary">{label}</h2>
      </div>
      <p className="type-metric-lg wrap-anywhere">{value}</p>
      {trend && <p className="mt-0.5! text-sm font-bold text-mint">{trend}</p>}
      {caption && <p className="mt-0.5! type-caption text-secondary">{caption}</p>}
    </Card>
  );
}
export function ProgressSkeleton() {
  return (
    <div role="status" aria-label="Loading progress" className="grid gap-3">
      <div className="h-28 rounded-2xl bg-surface-2" />
      <div className="h-11 rounded-full bg-surface-2" />
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-surface-2" />
        ))}
      </div>
      <div className="h-44 rounded-2xl bg-surface-2" />
    </div>
  );
}
