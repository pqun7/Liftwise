import { ChevronRight, ClipboardList, Dumbbell, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { countLabel, programDayMetadata, type HomeData } from '../../features/home/homeData';

export function HomeSecondaryCards({ data }: { data: HomeData }) {
  const next =
    data.nextDays.find(
      ({ day }) =>
        day.id !== data.suggestion?.day.id && day.id !== data.active?.session.programDayId,
    ) ?? data.nextDays[0];
  const activeProgram = data.programs.find(({ program }) => program.id === data.activeProgramId);
  const cards = [
    {
      title: 'Next Workout',
      to: next ? `/plan/${next.day.programId}/days/${next.day.id}` : '/workout',
      Icon: Dumbbell,
      accent: 'home-mint',
      value: next?.day.name ?? 'Quick Workout',
      detail: next ? programDayMetadata(next) : 'Train without a program',
    },
    {
      title: 'Recent Insight',
      to: '/progress',
      Icon: Flame,
      accent: 'home-coral',
      value: `${countLabel(data.summary.workouts, 'workout')} this week`,
      detail: countLabel(data.summary.workingSets, 'working set'),
    },
    {
      title: 'Your Programs',
      to: activeProgram ? `/plan/${activeProgram.program.id}` : '/plan',
      Icon: ClipboardList,
      accent: 'home-mint',
      value: activeProgram?.program.name ?? 'Build your routine',
      detail: activeProgram
        ? countLabel(activeProgram.days.length, 'training day')
        : 'A plan that works for you',
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
