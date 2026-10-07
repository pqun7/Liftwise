import { useState } from 'react';
import { BedDouble, Dumbbell, MoreHorizontal, Pencil } from 'lucide-react';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/FormControl';
import {
  deleteProgramDay,
  duplicateProgramDay,
  moveProgramDay,
  updateProgramDay,
} from './programService';
import { estimatedProgramMinutes } from './programDisplay';
import { weekdays } from './builderService';
import { PlanSheet } from './PlanSheet';

export function DayStructure({
  entry,
  graph,
  index,
  busy,
  run,
}: {
  entry: ProgramGraph['days'][number];
  graph: ProgramGraph;
  index: number;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const { day, exercises } = entry;
  const cycle = graph.program.scheduleType === 'cycle';
  const [menu, setMenu] = useState(false);
  const [rename, setRename] = useState(false);
  const [name, setName] = useState(day.name);
  const rest = day.kind === 'recovery';
  const minutes = estimatedProgramMinutes(exercises);
  const free = weekdays
    .map((_, i) => i)
    .find((value) => !graph.days.some(({ day: item }) => item.weekday === value));
  return (
    <article
      className={`structure-day ${rest ? 'is-recovery' : ''}`}
      aria-label={`${day.name} schedule day`}
    >
      <div className="structure-day-row">
        {cycle ? (
          <>
            <span className="day-number">{index + 1}</span>
          </>
        ) : (
          <span className="assignment-weekday">
            {day.weekday == null ? 'Unassigned' : weekdays[day.weekday]}
          </span>
        )}
        <span className={`day-icon day-color-${index % 6}`}>
          {rest ? <BedDouble size={22} /> : <Dumbbell size={22} />}
        </span>
        <div className="day-copy">
          <strong>{day.name}</strong>
          <small>
            {rest
              ? 'Rest day'
              : exercises.length
                ? `${exercises.length} exercises${minutes == null ? '' : ` · ~${minutes} min`}`
                : 'No exercises yet'}
          </small>
        </div>
        <button
          className="day-menu-trigger"
          aria-label={`Rename ${day.name}`}
          disabled={busy}
          onClick={() => {
            setName(day.name);
            setRename(true);
          }}
        >
          <Pencil size={15} />
        </button>
        <button
          className="day-menu-trigger"
          aria-label={`Options for ${day.name}`}
          aria-expanded={menu}
          disabled={busy}
          onClick={() => setMenu(!menu)}
        >
          <MoreHorizontal size={19} />
        </button>
      </div>
      {menu ? (
        <div className="day-actions">
          <Button
            disabled={busy || (!cycle && free == null)}
            onClick={() =>
              void run(() => duplicateProgramDay(day.id, cycle ? undefined : free)).then((ok) => {
                if (ok) setMenu(false);
              })
            }
          >
            Duplicate day
          </Button>
          {cycle ? (
            <>
              <Button
                disabled={busy || index === 0}
                onClick={() => void run(() => moveProgramDay(graph.program.id, day.id, -1))}
              >
                Move up
              </Button>
              <Button
                disabled={busy || index === graph.days.length - 1}
                onClick={() => void run(() => moveProgramDay(graph.program.id, day.id, 1))}
              >
                Move down
              </Button>
            </>
          ) : null}
          <Button
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Delete ${day.name} and its exercises? Workout history is kept.`))
                void run(() => deleteProgramDay(day.id));
            }}
          >
            Delete day
          </Button>
        </div>
      ) : null}
      {rename ? (
        <PlanSheet
          labelId={`rename-${day.id}`}
          close={() => {
            if (!busy) setRename(false);
          }}
        >
          <form
            className="plan-sheet"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim())
                void run(() => updateProgramDay(day.id, { name })).then((ok) => {
                  if (ok) setRename(false);
                });
            }}
          >
            <h2 id={`rename-${day.id}`}>Rename {rest ? 'recovery day' : 'workout'}</h2>
            <label>
              {rest ? 'Day name' : 'Workout name'}
              <Input
                autoFocus
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <p className="text-secondary">{name.length}/120</p>
            <div className="rename-suggestions">
              {(rest
                ? ['Recovery', 'Rest Day', 'Active Recovery']
                : ['Push A', 'Pull A', 'Legs A', 'Upper', 'Lower', 'Full Body']
              ).map((value) => (
                <Button key={value} onClick={() => setName(value)}>
                  {value}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => setRename(false)}>
                Cancel
              </Button>
              <Button disabled={busy || !name.trim()} variant="primary" type="submit">
                Save
              </Button>
            </div>
          </form>
        </PlanSheet>
      ) : null}
    </article>
  );
}
