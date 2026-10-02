import type { ReactNode } from 'react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { LocalStatus } from '../../components/home/LocalStatus';
import { Card } from '../../components/ui/Card';
import type { DateRange } from '../../domain/analytics';

export const progressLayout = 'grid gap-3 [&_h1]:m-0 [&_h2]:m-0 [&_h3]:m-0 [&_p]:m-0';
export const surface =
  'rounded-[16px] border border-border bg-gradient-to-br from-surface-2 to-surface';
export const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint';
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
    <header className="grid gap-3 pb-1">
      <div className="flex min-h-11 items-center justify-between">
        {overview ? (
          <p className="text-[26px] font-extrabold tracking-[-0.05em]" aria-label="Liftwise">
            Lift<span className="text-mint">wise</span>
          </p>
        ) : (
          <Link
            to="/progress"
            aria-label="Back to Progress"
            className={`${focus} flex size-11 items-center justify-center rounded-full border border-border bg-surface-3 text-primary`}
          >
            <ArrowLeft size={19} />
          </Link>
        )}
        <LocalStatus />
      </div>
      <div>
        <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.035em]">{title}</h1>
        <p className="mt-1! text-sm leading-[1.45] text-secondary">{description}</p>
      </div>
    </header>
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
    <Card
      padding="none"
      className="rounded-[16px] bg-gradient-to-br from-surface-2 to-surface p-2.5"
    >
      <div className="flex items-start gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-mint/10 text-mint">
          <Icon size={20} />
        </span>
        <h2 className="pt-0.5 text-[11px] leading-[14px] font-medium">{label}</h2>
      </div>
      <p className="mt-1.5! text-[23px] leading-7 font-extrabold tracking-[-0.035em] tabular-nums">
        {value}
      </p>
      {trend && <p className="mt-0.5! text-sm font-bold text-mint">{trend}</p>}
      {caption && <p className="mt-0.5! text-[10px] leading-[14px] text-secondary">{caption}</p>}
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
