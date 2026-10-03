import { useMatches } from 'react-router-dom';
import type { StreakStats } from '../../domain/streak';

// Child loaders own their data; the shell supplies headers on remaining routes.
export function useRouteStreak(): StreakStats | undefined {
  const matches = useMatches();
  for (let index = matches.length - 1; index >= 0; index--) {
    const data = matches[index]!.data as { streak?: StreakStats | null } | undefined;
    if (data?.streak) return data.streak;
  }
  return undefined;
}
