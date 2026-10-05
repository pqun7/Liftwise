import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/FormControl';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLoaderData, useNavigate } from 'react-router-dom';

import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import type { Program } from '../../domain/entities';
import { programBuilder } from './builderService';
import { BuilderHeader, BuilderFooter, NextLabel, SegmentedSelector } from './BuilderChrome';
import { UnsavedChanges } from './UnsavedChanges';

interface ProgramFormValues {
  name: string;
  description: string;
  goal: NonNullable<Program['goal']>;
  level: NonNullable<Program['level']>;
}

export function ProgramFormPage({ mode }: Readonly<{ mode: 'create' | 'edit' }>) {
  const loaderData = useLoaderData<{ graph: ProgramGraph } | undefined>();
  const program = mode === 'edit' ? loaderData?.graph.program : undefined;
  const navigate = useNavigate();
  const committedNavigation = useRef(false);
  const pending = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProgramFormValues>({
    defaultValues: {
      name: program?.name ?? '',
      description: program?.description ?? '',
      goal: program?.goal ?? 'strength',
      level: program?.level ?? 'intermediate',
    },
  });
  const submit = handleSubmit(async (values) => {
    if (pending.current) return;
    pending.current = true;
    setSaveError(null);
    try {
      const input = {
        name: values.name,
        description: values.description.trim() || null,
        goal: values.goal,
        level: values.level,
      };
      const saved = await programBuilder.saveBasics(input, program?.id);
      reset(values);
      committedNavigation.current = true;
      await navigate(`/plan/${saved.id}/build/days`, { replace: true });
    } catch {
      pending.current = false;
      committedNavigation.current = false;
      setSaveError('The program could not be saved. Your existing data is unchanged.');
    }
  });
  return (
    <section className="builder-page">
      <BuilderHeader
        title={program ? 'Edit Program' : 'Create Program'}
        back={program ? `/plan/${program.id}` : '/plan'}
        step={0}
        {...(program ? { programId: program.id } : {})}
      />
      <UnsavedChanges
        dirty={isDirty}
        saving={isSubmitting}
        committedNavigation={committedNavigation}
      />
      <form className="builder-basic-form" onSubmit={(event) => void submit(event)} noValidate>
        <Card as="div" className="exercise-form grid gap-5">
          <h2>Program details</h2>
          <label>
            <span>Program name</span>
            <Input
              autoComplete="off"
              enterKeyHint="next"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'program-name-error' : undefined}
              maxLength={120}
              {...register('name', {
                validate: (value) => value.trim().length > 0 || 'Enter a program name.',
              })}
            />
            {errors.name ? (
              <small id="program-name-error" role="alert">
                {errors.name.message}
              </small>
            ) : null}
          </label>
          <label>
            <span>Description (optional)</span>
            <Textarea
              aria-label="Description or notes"
              maxLength={2000}
              placeholder="Build strength, improve muscle mass, or get in better shape…"
              {...register('description')}
              rows={3}
            />
          </label>
          <SegmentedSelector
            legend="Goal"
            options={['strength', 'hypertrophy', 'general']}
            value={watch('goal')}
            onChange={(value) => setValue('goal', value, { shouldDirty: true })}
          />
          <SegmentedSelector
            legend="Training experience"
            options={['beginner', 'intermediate', 'advanced']}
            value={watch('level')}
            onChange={(value) => setValue('level', value, { shouldDirty: true })}
          />
        </Card>
        {saveError ? (
          <p className="form-error" role="alert">
            {saveError}
          </p>
        ) : null}
        <BuilderFooter>
          <Button
            variant="primary"
            className="w-full min-h-[54px]"
            type="submit"
            disabled={isSubmitting}
          >
            <NextLabel>{isSubmitting ? 'Saving…' : 'Next: Schedule'}</NextLabel>
          </Button>
        </BuilderFooter>
      </form>
    </section>
  );
}
