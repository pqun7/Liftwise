import { Bed, Dumbbell, Layers, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { weekdays } from './builderService';
import { estimatedProgramMinutes } from './programDisplay';
export function DayIcon({ name, recovery = false }: { name: string; recovery?: boolean }) {
  const color = recovery
    ? 'rest'
    : /pull|back/i.test(name)
      ? 'red'
      : /leg/i.test(name)
        ? 'yellow'
        : /lower/i.test(name)
          ? 'green'
          : /arm/i.test(name)
            ? 'orange'
            : /upper/i.test(name)
              ? 'purple'
              : 'blue';
  return (
    <span className={`day-icon day-icon-${color}`}>
      {recovery ? <Bed size={27} /> : <Dumbbell size={27} />}
    </span>
  );
}
export function ProgramIcon() {
  return (
    <span className="program-icon">
      <Layers size={34} />
    </span>
  );
}
export function DayMetadata({ entry }: { entry: ProgramGraph['days'][number] }) {
  const minutes = estimatedProgramMinutes(entry.exercises);
  return (
    <small>
      {entry.day.kind === 'recovery'
        ? 'Rest day'
        : `${entry.exercises.length} ${entry.exercises.length === 1 ? 'exercise' : 'exercises'}${minutes == null ? '' : ` · ~${minutes} min`}`}
    </small>
  );
}
export function WeekPreview({ graph }: { graph: ProgramGraph }) {
  if (graph.program.scheduleType === 'cycle')
    return (
      <div className="plan-week-preview cycle-preview">
        {graph.days.map(({ day }, index) => (
          <div key={day.id}>
            <span>{index + 1}</span>
            <i className={day.kind === 'recovery' ? '' : 'training'} />
            <small>{day.name}</small>
          </div>
        ))}
      </div>
    );
  return (
    <div className="plan-week-preview">
      {weekdays.map((name, index) => {
        const day = graph.days.find(({ day }) => day.weekday === index)?.day;
        return (
          <div key={name}>
            <span>{name.slice(0, 3)}</span>
            <i className={day && day.kind !== 'recovery' ? 'training' : ''} />
            <small>{day?.name ?? 'Rest'}</small>
          </div>
        );
      })}
    </div>
  );
}
export function DayOverview({ graph }: { graph: ProgramGraph }) {
  return (
    <div className="cycle-overview">
      {graph.days.map((entry, index) => (
        <Link
          className={`cycle-row ${entry.day.kind === 'recovery' ? 'recovery-row' : ''}`}
          key={entry.day.id}
          to={`/plan/${graph.program.id}/days/${entry.day.id}`}
        >
          <span className="day-number">{index + 1}</span>
          <DayIcon name={entry.day.name} recovery={entry.day.kind === 'recovery'} />
          <span className="day-row-copy">
            <strong>{entry.day.name}</strong>
            <DayMetadata entry={entry} />
          </span>
          <ChevronRight size={20} />
        </Link>
      ))}
    </div>
  );
}
export function EmptyDumbbell() {
  return (
    <svg viewBox="0 0 180 150" width="145" height="140" aria-hidden="true">
      <defs>
        <linearGradient id="plan-metal" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#95ebdd" />
          <stop offset=".18" stopColor="#2a8a80" />
          <stop offset=".48" stopColor="#06493e" />
          <stop offset=".8" stopColor="#002d25" />
          <stop offset="1" stopColor="#126f61" />
        </linearGradient>
        <linearGradient id="plan-plate" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#65bdb4" />
          <stop offset=".28" stopColor="#095f53" />
          <stop offset=".75" stopColor="#002b24" />
          <stop offset="1" stopColor="#006557" />
        </linearGradient>
      </defs>
      <g transform="rotate(-25 90 75)" stroke="#30998b" strokeWidth="1.2">
        <path d="M43 66h92v19H43z" fill="url(#plan-metal)" />
        <path d="M127 36h13c26 2 26 77 0 78h-13z" fill="url(#plan-metal)" />
        <ellipse cx="127" cy="75" rx="18" ry="39" fill="url(#plan-plate)" />
        <path d="M130 34h9c25 5 25 75 0 81h-9" fill="none" stroke="#93d4cb" />
        <path d="M31 39h14c25 3 25 72 0 75H31z" fill="url(#plan-metal)" />
        <ellipse cx="31" cy="76" rx="20" ry="37" fill="url(#plan-plate)" />
        <ellipse cx="30" cy="76" rx="13" ry="28" fill="#003e35" />
        <ellipse cx="30" cy="76" rx="5" ry="9" fill="#002a24" />
        <path d="M43 41c16 11 21 53 6 70" fill="none" stroke="#9ddcd2" />
        <path d="M64 68h47" fill="none" stroke="#84cfc2" />
      </g>
    </svg>
  );
}
