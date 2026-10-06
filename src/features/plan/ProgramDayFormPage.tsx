import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/FormControl';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLoaderData, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { weekdays } from './builderService';

import { BuilderHeader } from './BuilderChrome';
import { UnsavedChanges } from './UnsavedChanges';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { createProgramDay, updateProgramDay } from './programService';

interface DayFormValues {
  name: string;
  notes: string;
  defaultRestSeconds: string;
  weekday: string;
}

export function ProgramDayFormPage({ mode }: Readonly<{ mode: 'create' | 'edit' }>) {
  const { graph } = useLoaderData<{ graph: ProgramGraph }>();
  const { dayId } = useParams();
  const day = mode === 'edit' ? graph.days.find((entry) => entry.day.id === dayId)?.day : undefined;
  const navigate = useNavigate();
  const committedNavigation = useRef(false);
  const [params] = useSearchParams();
  const returnTo =
    params.get('return') === 'editor' && day
      ? `/plan/${graph.program.id}#day-${day.id}`
      : day
        ? `/plan/${graph.program.id}/days/${day.id}`
        : `/plan/${graph.program.id}`;
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DayFormValues>({
    defaultValues: {
      name: day?.name ?? '',
      notes: day?.notes ?? '',
      defaultRestSeconds: day?.defaultRestSeconds?.toString() ?? '180',
      weekday: day
        ? (day.weekday?.toString() ?? '')
        : String(
            weekdays.findIndex((_, index) => !graph.days.some(({ day }) => day.weekday === index)),
          ),
    },
  });
  const submit = handleSubmit(async (values) => {
    setSaveError(null);
    try {
      const input = {
        name: values.name,
        weekday:
          graph.program.scheduleType === 'cycle' || values.weekday === ''
            ? null
            : Number(values.weekday),
        notes: values.notes.trim() || null,
        defaultRestSeconds: values.defaultRestSeconds.trim()
          ? Number(values.defaultRestSeconds)
          : null,
      };
      const saved = day
        ? await updateProgramDay(day.id, input)
        : await createProgramDay(graph.program.id, input);
      reset(values);
      committedNavigation.current = true;
      await navigate(
        params.get('return') === 'editor'
          ? `/plan/${graph.program.id}#day-${saved.id}`
          : `/plan/${graph.program.id}/days/${saved.id}`,
        { replace: true },
      );
    } catch {
      committedNavigation.current = false;
      setSaveError('The program day could not be saved.');
    }
  });
  return (
    <section className="builder-page" aria-labelledby="day-form-title">
      <BuilderHeader
        title={graph.program.draft ? 'Create Program' : 'Edit Program'}
        back={returnTo}
        step={3}
        programId={graph.program.id}
        exercisesPath={returnTo}
      />
      <UnsavedChanges
        dirty={isDirty}
        saving={isSubmitting}
        committedNavigation={committedNavigation}
      />
      <Link className="back-link" to={returnTo}>
        ← {graph.program.name}
      </Link>
      <h2 id="day-form-title" className="sr-only">
        {day ? `Edit ${day.name}` : 'Add a training day'}
      </h2>
      <form
        className="builder-card exercise-form"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <label>
          <span>Day name</span>
          <Input
            aria-label="Day name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'day-name-error' : undefined}
            {...register('name', {
              validate: (value) => Boolean(value.trim()) || 'Enter a day name.',
            })}
            maxLength={120}
            placeholder="Push Day"
          />
          {errors.name ? (
            <small id="day-name-error" role="alert">
              {errors.name.message}
            </small>
          ) : null}
        </label>
        {graph.program.scheduleType !== 'cycle' && (
          <label>
            <span>Weekday</span>
            <Select
              aria-label="Weekday"
              aria-invalid={Boolean(errors.weekday)}
              aria-describedby={errors.weekday ? 'day-weekday-error' : undefined}
              {...register('weekday', {
                required: mode === 'create' ? 'Choose an available weekday.' : false,
              })}
            >
              <option value="">
                {mode === 'create' ? 'Choose an available weekday' : 'Unscheduled'}
              </option>
              {weekdays.map((weekday, index) => {
                const used = graph.days.some(
                  (entry) => entry.day.id !== day?.id && entry.day.weekday === index,
                );
                return (
                  <option key={weekday} value={index} disabled={used}>
                    {weekday}
                    {used ? ' · Already assigned' : ''}
                  </option>
                );
              })}
            </Select>
            {errors.weekday ? (
              <small id="day-weekday-error" role="alert">
                {errors.weekday.message}
              </small>
            ) : null}
          </label>
        )}
        <label>
          <span>Default rest in seconds</span>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            max="3600"
            aria-label="Default rest in seconds"
            aria-invalid={Boolean(errors.defaultRestSeconds)}
            aria-describedby={errors.defaultRestSeconds ? 'day-rest-error' : undefined}
            {...register('defaultRestSeconds', {
              min: 0,
              max: 3600,
              validate: (value) =>
                value.trim() === '' || Number.isInteger(Number(value)) || 'Use a whole number.',
            })}
          />
          {errors.defaultRestSeconds ? (
            <small id="day-rest-error" role="alert">
              {errors.defaultRestSeconds.message || 'Use 0–3600 seconds.'}
            </small>
          ) : null}
          <small>Used for newly added prescriptions. Existing rest targets do not change.</small>
        </label>
        <label>
          <span>Day notes</span>
          <Textarea {...register('notes')} rows={4} />
        </label>
        {saveError ? (
          <p className="form-error" role="alert">
            {saveError}
          </p>
        ) : null}
        {mode === 'create' && graph.program.scheduleType !== 'cycle' && graph.days.length >= 7 ? (
          <p className="text-sm text-secondary">
            All seven training-day slots are used. Return to the editor to change or delete a day.
          </p>
        ) : null}
        <Button
          variant="primary"
          className="w-full min-h-[54px]"
          type="submit"
          disabled={
            isSubmitting ||
            (mode === 'create' && graph.program.scheduleType !== 'cycle' && graph.days.length >= 7)
          }
        >
          {isSubmitting ? 'Saving…' : day ? 'Save day' : 'Add day'}
        </Button>
      </form>
    </section>
  );
}
