import { useRef, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { BuilderHeader } from './BuilderChrome';
import { ScheduleEmpty } from './ScheduleView';
import { planCalendar } from './scheduleData';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/FormControl';
import { weekdayNames } from '../../domain/localCalendar';
import type { ProgramListData } from './programService';
import { saveProgramSchedule } from './programService';
import { UnsavedChanges } from './UnsavedChanges';

export function ScheduleSettingsPage() {
  const data = useLoaderData<ProgramListData>();
  const { graph } = planCalendar(data);
  return graph ? (
    <ScheduleEditor key={graph.program.id + graph.program.updatedAt} data={data} />
  ) : (
    <section className="grid gap-4">
      <BuilderHeader title="Schedule settings" back="/plan" />
      <ScheduleEmpty
        title="No program yet"
        description="Choose an active program before setting its schedule."
        to="/plan?tab=program"
        action="Choose Program"
      />
    </section>
  );
}

function ScheduleEditor({ data }: { data: ProgramListData }) {
  const { graph } = planCalendar(data);
  const program = graph!.program;
  const cycle = program.scheduleType === 'cycle';
  const [anchor, setAnchor] = useState(program.cycleStartDate ?? '');
  const [assignments, setAssignments] = useState(() =>
    Object.fromEntries(
      graph!.days.map(({ day }) => [day.id, day.weekday == null ? '' : String(day.weekday)]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const committedNavigation = useRef(false);
  const navigate = useNavigate();
  const dirty = cycle
    ? anchor !== (program.cycleStartDate ?? '')
    : graph!.days.some(
        ({ day }) => assignments[day.id] !== (day.weekday == null ? '' : String(day.weekday)),
      );
  return (
    <section className="grid gap-4 font-ui">
      <UnsavedChanges dirty={dirty} saving={busy} committedNavigation={committedNavigation} />
      <BuilderHeader title="Schedule settings" back="/plan" backLabel="Back to Schedule" />
      <Card variant="glass" padding="spacious" radius="hero" className="grid gap-4">
        <h2 className="type-section-title">{program.name}</h2>
        <p className="text-secondary">
          {cycle
            ? 'Choose when Day 1 begins. Your ordered program cycle repeats from this date, including rest days.'
            : 'Assign your existing training days to weekdays. Unassigned days remain available in Program and Workout.'}
        </p>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (pending.current) return;
            pending.current = true;
            setBusy(true);
            setError(null);
            void saveProgramSchedule(
              program.id,
              cycle ? { cycleStartDate: anchor || null } : { weekdays: assignments },
            )
              .then(() => {
                committedNavigation.current = true;
                pending.current = false;
                setBusy(false);
                void navigate('/plan');
              })
              .catch((failure: unknown) => {
                pending.current = false;
                setBusy(false);
                setError(
                  failure instanceof Error
                    ? failure.message
                    : 'Could not save schedule. Try again.',
                );
              });
          }}
        >
          {cycle ? (
            <label className="grid gap-2 type-body-small">
              Cycle start date
              <Input
                type="date"
                disabled={busy}
                value={anchor}
                onChange={(event) => setAnchor(event.target.value)}
              />
            </label>
          ) : (
            graph!.days.map(({ day }) => (
              <label key={day.id} className="grid gap-2 type-body-small">
                {day.name}
                <Select
                  disabled={busy}
                  value={assignments[day.id]}
                  onChange={(event) =>
                    setAssignments((values) => ({ ...values, [day.id]: event.target.value }))
                  }
                >
                  <option value="">Unscheduled</option>
                  {weekdayNames.map((name, index) => (
                    <option key={name} value={index}>
                      {name}
                    </option>
                  ))}
                </Select>
              </label>
            ))
          )}
          {error ? <p role="alert">{error}</p> : null}
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save Schedule'}
          </Button>
        </form>
      </Card>
    </section>
  );
}
