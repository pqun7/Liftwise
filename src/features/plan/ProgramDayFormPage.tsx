import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLoaderData, useNavigate, useParams } from 'react-router-dom';

import { BuilderHeader } from './BuilderChrome';
import { UnsavedChanges } from './UnsavedChanges';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { createProgramDay, updateProgramDay } from './programService';

interface DayFormValues {
  name: string;
  notes: string;
  defaultRestSeconds: string;
}

export function ProgramDayFormPage({ mode }: Readonly<{ mode: 'create' | 'edit' }>) {
  const { graph } = useLoaderData<{ graph: ProgramGraph }>();
  const { dayId } = useParams();
  const day = mode === 'edit' ? graph.days.find((entry) => entry.day.id === dayId)?.day : undefined;
  const navigate = useNavigate();
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
    },
  });
  const submit = handleSubmit(async (values) => {
    setSaveError(null);
    try {
      const input = {
        name: values.name,
        notes: values.notes.trim() || null,
        defaultRestSeconds: values.defaultRestSeconds.trim()
          ? Number(values.defaultRestSeconds)
          : null,
      };
      const saved = day
        ? await updateProgramDay(day.id, input)
        : await createProgramDay(graph.program.id, input);
      reset(values);
      await navigate(`/plan/${graph.program.id}/days/${saved.id}`, { replace: true });
    } catch {
      setSaveError('The program day could not be saved.');
    }
  });
  return (
    <section className="builder-page" aria-labelledby="day-form-title">
      <BuilderHeader
        title={day ? 'Day Settings' : 'Add Training Day'}
        back={day ? `/plan/${graph.program.id}/days/${day.id}` : `/plan/${graph.program.id}`}
      />
      <UnsavedChanges dirty={isDirty} saving={isSubmitting} />
      <Link
        className="back-link"
        to={day ? `/plan/${graph.program.id}/days/${day.id}` : `/plan/${graph.program.id}`}
      >
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
          <input {...register('name', { required: 'Enter a day name.' })} placeholder="Push Day" />
          {errors.name ? <small role="alert">{errors.name.message}</small> : null}
        </label>
        <label>
          <span>Default rest in seconds</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="3600"
            {...register('defaultRestSeconds', { min: 0, max: 3600 })}
          />
          {errors.defaultRestSeconds ? <small role="alert">Use 0–3600 seconds.</small> : null}
          <small>Used for newly added prescriptions. Existing rest targets do not change.</small>
        </label>
        <label>
          <span>Day notes</span>
          <textarea {...register('notes')} rows={4} />
        </label>
        {saveError ? (
          <p className="form-error" role="alert">
            {saveError}
          </p>
        ) : null}
        <button className="primary-action" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : day ? 'Save day' : 'Add day'}
        </button>
      </form>
    </section>
  );
}
