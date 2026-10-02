import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Metric } from '../../domain/analytics';
import { number } from './format';
type Point = {
  date: string;
  value: number | null;
  weight?: number | null | undefined;
  reps?: number | null | undefined;
  rir?: number | null | undefined;
};
export default function TrendChart({
  points,
  metric,
}: Readonly<{ points: Point[]; metric: Metric }>) {
  return (
    <div
      className="mt-2 h-[205px] min-w-0 w-full"
      role="img"
      aria-label={`${metric} across ${points.length} completed sessions. Values and session links are available below.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          accessibilityLayer
          data={points}
          margin={{ top: 12, right: 8, left: -24, bottom: 0 }}
        >
          <defs>
            <linearGradient id="performance-fill" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="var(--mint)" stopOpacity={0.18} />
              <stop offset="1" stopColor="var(--mint)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-default)" strokeOpacity={0.6} />
          <XAxis
            dataKey="date"
            tickFormatter={(date) =>
              new Date(String(date)).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })
            }
            stroke="var(--border-default)"
            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
            tickLine={false}
            minTickGap={22}
          />
          <YAxis
            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
            stroke="var(--border-default)"
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            cursor={{ stroke: 'var(--mint)', strokeDasharray: '4 4' }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as Point | undefined;
              return active && point ? (
                <div className="rounded-xl border border-border bg-surface-3 px-3 py-2 text-xs text-primary shadow-lg">
                  <p className="text-secondary">
                    {new Date(point.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="mt-1 font-semibold">
                    {metric === 'weight'
                      ? `${number(point.weight)} kg × ${point.reps ?? '—'} reps`
                      : `${number(point.value)} ${metric === 'e1rm' ? 'kg' : metric === 'volume' ? 'kg·reps' : 'reps'}`}
                  </p>
                  {point.rir != null && <p>RIR {point.rir}</p>}
                </div>
              ) : null;
            }}
          />
          <Area
            type="linear"
            dataKey="value"
            fill="url(#performance-fill)"
            stroke="none"
            isAnimationActive={false}
            tooltipType="none"
          />
          <Line
            type="linear"
            dataKey="value"
            stroke="var(--mint)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--mint)', stroke: 'var(--surface-1)' }}
            activeDot={{ r: 6, stroke: 'var(--mint)', strokeWidth: 2, fill: 'var(--surface-3)' }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
