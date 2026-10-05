import { StreakBadge } from '../ui/StreakBadge';
import { AppWordmark } from '../ui/AppWordmark';
import { useRouteStreak } from '../../features/progress/useRouteStreak';

export function HomeHeader({ greeting, active }: { greeting: string; active: boolean }) {
  const streak = useRouteStreak();
  return (
    <header className={`home-header${active ? ' home-header-active' : ''}`}>
      <div className="home-brand-row">
        <AppWordmark />
        <StreakBadge currentStreak={streak?.currentStreak ?? 0} />
      </div>
      {active ? (
        <p className="home-subtitle">Your private training space</p>
      ) : (
        <div className="home-greeting">
          <p>{greeting}</p>
          <h1>Welcome to Liftwise</h1>
        </div>
      )}
      {active ? <h1 className="sr-only">Welcome to Liftwise</h1> : null}
    </header>
  );
}
