import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLoaderData, useNavigate } from 'react-router-dom';

import { PageIntro } from '../../components/PageIntro';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { createProgram, updateProgram } from './programService';

interface ProgramFormValues {
  name: string;
  description: string;
}

export function ProgramFormPage({ mode }: Readonly<{ mode: 'create' | 'edit' }>) {
  const loaderData = useLoaderData<{ graph: ProgramGraph } | undefined>();
  const program = mode === 'edit' ? loaderData?.graph.program : undefined;
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProgramFormValues>({
    values: { name: program?.name ?? '', description: program?.description ?? '' },
  });
  const submit = handleSubmit(async (values) => {
    setSaveError(null);
    try {
      const input = { name: values.name, description: values.description.trim() || null };
      const saved = program ? await updateProgram(program.id, input) : await createProgram(input);
      await navigate(`/plan/${saved.id}`, { replace: true });
    } catch {
      setSaveError('The program could not be saved. Your existing data is unchanged.');
    }
  });
  return (
    <section className="page-stack" aria-labelledby="program-form-title">
      <Link className="back-link" to={program ? `/plan/${program.id}` : '/plan'}>
        ← Programs
      </Link>
      <PageIntro
        titleId="program-form-title"
        eyebrow={program ? 'Edit program' : 'New program'}
        title={program ? `Edit ${program.name}` : 'Build a training plan'}
        description="Give the program a clear name. Days and prescriptions come next."
      />
      <form className="exercise-form" onSubmit={(event) => void submit(event)} noValidate>
        <label>
          <span>Program name</span>
          <input {...register('name', { required: 'Enter a program name.' })} autoFocus />
          {errors.name ? <small role="alert">{errors.name.message}</small> : null}
        </label>
        <label>
          <span>Description or notes</span>
          <textarea {...register('description')} rows={4} />
        </label>
        {saveError ? (
          <p className="form-error" role="alert">
            {saveError}
          </p>
        ) : null}
        <button className="primary-action" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : program ? 'Save program' : 'Create program'}
        </button>
      </form>
    </section>
  );
}
