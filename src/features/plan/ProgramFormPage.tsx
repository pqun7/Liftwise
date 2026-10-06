import { CalendarDays, Repeat2, Check, Plus, ChevronRight } from 'lucide-react';
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
  scheduleType: 'weekly' | 'cycle';
  level: NonNullable<Program['level']>;
}
export function ProgramFormPage({ mode }: Readonly<{ mode: 'create' | 'edit' }>) {
  const loaderData = useLoaderData<{ graph: ProgramGraph } | undefined>();
  const program = mode === 'edit' ? loaderData?.graph.program : undefined;
  const navigate = useNavigate();
  const committedNavigation = useRef(false);
  const pending = useRef(false);
  const [descriptionOpen, setDescriptionOpen] = useState(Boolean(program?.description));
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
      scheduleType: program?.scheduleType ?? 'weekly',
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
        scheduleType: values.scheduleType,
        description: values.description.trim() || null,
        goal: values.goal,
        level: values.level,
      };
      const saved = await programBuilder.saveBasics(input, program?.id);
      reset(values);
      committedNavigation.current = true;
      await navigate(`/plan/${saved.id}/build/days?stage=program`, { replace: true });
    } catch (failure) {
      pending.current = false;
      committedNavigation.current = false;
      setSaveError(
        failure instanceof Error ? failure.message : 'The program could not be saved. Try again.',
      );
    }
  });
  return (
    <section className="builder-page">
      <BuilderHeader
        title={program ? 'Edit Program' : 'Create Program'}
        back="/plan"
        step={0}
        {...(program ? { programId: program.id } : {})}
      />
      <UnsavedChanges
        dirty={isDirty}
        saving={isSubmitting}
        committedNavigation={committedNavigation}
      />
      <form className="builder-basic-form" onSubmit={(event) => void submit(event)} noValidate>
        <Card as="div" className="exercise-form basics-content grid gap-5">
          <div>
            <h2>Program details</h2>
            <p className="builder-subtitle">
              Give your program a name and choose your goals to get started.
            </p>
          </div>
          <label>
            <span>Program name</span>
            <Input
              aria-label="Program name"
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
          <div className="description-disclosure">
            <span>Description (optional)</span>
            {descriptionOpen ? (
              <Textarea
                aria-label="Description or notes"
                maxLength={2000}
                {...register('description')}
                rows={3}
              />
            ) : (
              <button type="button" onClick={() => setDescriptionOpen(true)}>
                <Plus size={22} />
                Add description
                <ChevronRight size={20} />
              </button>
            )}
          </div>
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
          <section className="schedule-type">
            <h2>Schedule type</h2>
            <p className="builder-subtitle">Choose how you want to structure your training.</p>
            {(['weekly', 'cycle'] as const).map((type) => {
              const weekly = type === 'weekly';
              const Icon = weekly ? CalendarDays : Repeat2;
              return (
                <label
                  key={type}
                  className={`schedule-type-card ${watch('scheduleType') === type ? 'is-selected' : ''}`}
                >
                  <input type="radio" value={type} {...register('scheduleType')} />
                  <div className="schedule-type-heading">
                    <span className="builder-icon">
                      <Icon size={28} />
                    </span>
                    <div>
                      <strong>{weekly ? 'Weekly Schedule' : 'Flexible Cycle'}</strong>
                      {!weekly && <small className="advanced-badge">Advanced</small>}
                      <p>
                        {weekly
                          ? 'Train on specific days of the week.'
                          : 'Follow workouts in sequence, independent of weekdays.'}
                      </p>
                    </div>
                    {watch('scheduleType') === type && <Check size={19} className="choice-check" />}
                  </div>
                  <div className="schedule-examples">
                    {(weekly
                      ? ['Mon · Push', 'Wed · Pull', 'Fri · Legs']
                      : ['Day 1 · Push', 'Day 2 · Pull', 'Day 3 · Legs', 'Day 4 · Rest']
                    ).map((text) => (
                      <span key={text}>{text}</span>
                    ))}
                  </div>
                  <div className="schedule-best">
                    Best for:
                    {(weekly
                      ? ['Fixed weekly routines', 'Predictable gym days']
                      : ['Rotating routines', '8–10 day splits', 'Flexible training weeks']
                    ).map((text) => (
                      <p key={text}>
                        <Check size={14} />
                        {text}
                      </p>
                    ))}
                  </div>
                </label>
              );
            })}
          </section>
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
            <NextLabel>{isSubmitting ? 'Saving…' : 'Continue to Program'}</NextLabel>
          </Button>
        </BuilderFooter>
      </form>
    </section>
  );
}
