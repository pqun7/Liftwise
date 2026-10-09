import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Play } from 'lucide-react';
import { database } from '../../lib/storage/database';

export function SessionReturnBar() {
  const { pathname } = useLocation();
  const [session, setSession] = useState<{
    id: string;
    name: string | null;
    status: string;
  } | null>(null);
  useEffect(() => {
    let signature = '';
    const subscription = liveQuery(() =>
      database.workoutSessions.where('status').anyOf(['active', 'paused']).toArray(),
    ).subscribe({
      next: (sessions) => {
        const current = sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
        const next = current ? `${current.id}:${current.name}:${current.status}` : '';
        if (signature === next) return;
        signature = next;
        setSession(current ? { id: current.id, name: current.name, status: current.status } : null);
      },
      error: () => setSession(null),
    });
    return () => subscription.unsubscribe();
  }, []);
  if (!session || pathname === `/workout/${session.id}`) return null;
  return (
    <aside className="session-return-bar" aria-label="Saved workout">
      <span className="min-w-0 truncate text-sm">
        {session.name ?? 'Quick Workout'} · {session.status === 'paused' ? 'Paused' : 'In progress'}
      </span>
      <Link
        to={`/workout/${session.id}`}
        className="ui-button ui-button-primary"
        aria-label="Return to saved workout"
      >
        <Play size={16} aria-hidden="true" />
        Continue
      </Link>
    </aside>
  );
}
