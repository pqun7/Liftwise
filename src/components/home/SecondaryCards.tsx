import { ChevronRight, Dumbbell, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { countLabel, type HomeData } from '../../features/home/homeData';

export function HomeSecondaryCards({ data }: { data: HomeData }) {
  const cards = [
    {
      title: 'Recent Insight',
      to: '/progress',
      Icon: Flame,
      accent: 'home-coral',
      value: `${countLabel(data.summary.workouts, 'workout')} this week`,
      detail: countLabel(data.summary.workingSets, 'working set'),
    },
    {
      title: 'Browse Exercises',
      to: '/exercises',
      Icon: Dumbbell,
      accent: '',
      value: data.catalogCount ? `${data.catalogCount} built-in exercises` : 'Exercise Library',
      detail: 'Find your next movement',
    },
  ];
  return (
    <div className="home-secondary-grid">
      {cards.map(({ title, to, Icon, accent, value, detail }) => (
        <Link key={title} className="home-surface ui-card home-small-card" to={to}>
          <h2>
            {title}
            <ChevronRight size={18} aria-hidden="true" />
          </h2>
          <Icon className={accent} size={30} aria-hidden="true" />
          <strong>{value}</strong>
          <span>{detail}</span>
        </Link>
      ))}
    </div>
  );
}
