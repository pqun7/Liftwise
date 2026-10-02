import { Clock3, Flame } from 'lucide-react';
import { countLabel, trainingTime, type HomeData } from '../../features/home/homeData';

export function InsightCard({ data }: { data: HomeData }) {
  const difference = data.summary.workouts - data.previousSummary.workouts;
  return (
    <section className="home-surface home-insights" aria-labelledby="home-insights-title">
      <h2 id="home-insights-title">Insights</h2>
      <div className="home-insight-grid">
        <div>
          <Flame className="home-coral" size={29} aria-hidden="true" />
          <p>
            <strong>{countLabel(data.summary.workouts, 'workout')} this week</strong>
            <span>
              {difference === 0
                ? 'Same as last week'
                : `${difference > 0 ? '+' : ''}${difference} from last week`}
            </span>
          </p>
        </div>
        <div>
          <Clock3 className="home-blue" size={28} aria-hidden="true" />
          <p>
            <strong>{trainingTime(data.summary.durationSeconds)}</strong>
            <span className="home-muted">total training time</span>
          </p>
        </div>
      </div>
    </section>
  );
}
