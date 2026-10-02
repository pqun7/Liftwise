import { CalendarDays, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { countLabel } from '../../features/home/homeData';

export function ProgramCard({ graph, active }: { graph: ProgramGraph; active: boolean }) {
  return (
    <Link className="home-list-item" to={`/plan/${graph.program.id}`}>
      <span className="home-tile-icon home-tile-neutral">
        <CalendarDays size={22} aria-hidden="true" />
      </span>
      <span className="home-list-copy">
        <strong>{graph.program.name}</strong>
        <span>{countLabel(graph.days.length, 'training day')}</span>
      </span>
      <span className="home-list-end">
        <span className={`home-badge${active ? '' : ' home-badge-neutral'}`}>
          {active ? 'Active' : 'Not active'}
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </span>
    </Link>
  );
}
