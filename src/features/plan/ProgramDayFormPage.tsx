import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLoaderData, useNavigate, useParams } from 'react-router-dom';

import { PageIntro } from '../../components/PageIntro';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { createProgramDay, updateProgramDay } from './programService';

interface DayFormValues {
  name: string;
  notes: string;
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
    formState: { errors, isSubmitting },
  } = useForm<DayFormValues>({
    values: { name: day?.name ?? '', notes: day?.notes ?? '' },
  });
  const submit = handleSubmit(async (values) => {
    setSaveError(null);
    try {
      const input = { name: values.name, notes: values.notes.trim() || null };
      const saved = day
        ? await updateProgramDay(day.id, input)
        : await createProgramDay(graph.program.id, input);
      await navigate(`/plan/${graph.program.id}/days/${saved.id}`, { replace: true });
    } catch {
      setSaveError('The program day could not be saved.');
    }
  });
  return (
    <section className="page-stack" aria-labelledby="day-form-title">
      <Link
        className="back-link"
        to={day ? `/plan/${graph.program.id}/days/${day.id}` : `/plan/${graph.program.id}`}
      >
        ← {graph.program.name}
      </Link>
      <PageIntro
        titleId="day-form-title"
        eyebrow={day ? 'Edit day' : 'New day'}
        title={day ? `Edit ${day.name}` : 'Add a training day'}
        description="A day is an ordered plan, not a workout history record."
      />
      <form className="exercise-form" onSubmit={(event) => void submit(event)} noValidate>
        <label>
          <span>Day name</span>
          <input
            {...register('name', { required: 'Enter a day name.' })}
            placeholder="Push Day"
            autoFocus
          />
          {errors.name ? <small role="alert">{errors.name.message}</small> : null}
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
