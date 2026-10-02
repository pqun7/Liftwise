import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { weekdays } from './builderService';

export function WeeklySchedule({
  graph,
  selectDay,
  edit,
}: {
  graph: ProgramGraph;
  selectDay?: (id: string) => void;
  edit?: () => void;
}) {
  return (
    <section className="plan-schedule" aria-label="Weekly schedule">
      <div className="plan-section-heading">
        <h2>Weekly Schedule</h2>
        {edit ? <button onClick={edit}>Edit</button> : null}
      </div>
      <div>
        {weekdays.map((name, index) => {
          const entry = graph.days.find(({ day }) => day.weekday === index);
          const content = (
            <>
              <span className="plan-weekday">{name.slice(0, 3)}</span>
              <span
                className={`plan-dot ${entry ? `plan-dot-${index % 3}` : ''}`}
                aria-hidden="true"
              />
              <span className={`plan-schedule-name ${entry ? '' : 'text-muted'}`}>
                {entry?.day.name ?? 'Rest'}
              </span>
              <span className="plan-count">
                {entry ? `${entry.exercises.length}${selectDay ? ' exercises' : ''}` : '–'}
              </span>
              {entry ? <ChevronRight size={14} aria-hidden="true" /> : <span className="w-3.5" />}
            </>
          );
          return entry ? (
            selectDay ? (
              <button
                key={name}
                className="plan-schedule-row"
                onClick={() => selectDay(entry.day.id)}
                aria-label={`${name}, ${entry.day.name}, ${entry.exercises.length} exercises`}
              >
                {content}
              </button>
            ) : (
              <Link
                key={name}
                className="plan-schedule-row"
                to={`/plan/${graph.program.id}#day-${entry.day.id}`}
              >
                {content}
              </Link>
            )
          ) : (
            <div key={name} className="plan-schedule-row">
              {content}
            </div>
          );
        })}
      </div>
      {graph.days.some(({ day }) => day.weekday == null) ? (
        <p className="text-xs text-secondary pt-3">
          Unscheduled days: assign a weekday in the editor.
        </p>
      ) : null}
    </section>
  );
}
