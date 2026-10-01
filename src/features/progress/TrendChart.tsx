import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Metric } from '../../domain/analytics';
export default function TrendChart({
  points,
  metric,
}: Readonly<{ points: { date: string; value: number | null }[]; metric: Metric }>) {
  return (
    <div className="trend-chart" aria-hidden="true">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          accessibilityLayer={false}
          data={points}
          margin={{ top: 10, right: 12, left: 0, bottom: 10 }}
        >
          <XAxis
            dataKey="date"
            tickFormatter={(date) =>
              new Date(String(date)).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })
            }
          />
          <YAxis width={50} />
          <Tooltip
            labelFormatter={(date) =>
              typeof date === 'string' ? new Date(date).toLocaleDateString() : ''
            }
          />
          <Line
            name={metric}
            dataKey="value"
            stroke="#77efb5"
            strokeWidth={2}
            dot
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
