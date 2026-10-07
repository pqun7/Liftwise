import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/FormControl';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router-dom';

import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import type { Program } from '../../domain/entities';
import { programBuilder } from './builderService';
import { BuilderHeader, BuilderFooter, NextLabel, SegmentedSelector } from './BuilderChrome';
import { UnsavedChanges } from './UnsavedChanges';
import { reviewDestination } from './reviewNavigation';
import {
  CalendarDays,
  Repeat2,
  Plus,
  Dumbbell,
  ChartNoAxesColumnIncreasing,
  Target,
  UserRound,
  Crown,
  Check,
} from 'lucide-react';

interface ProgramFormValues {
  name: string;
  description: string;
  goal: NonNullable<Program['goal']>;
  level: NonNullable<Program['level']>;
  scheduleType: NonNullable<Program['scheduleType']>;
}

export function ProgramFormPage({ mode }: Readonly<{ mode: 'create' | 'edit' }>) {
  const loaderData = useLoaderData<{ graph: ProgramGraph } | undefined>();
  const program = mode === 'edit' ? loaderData?.graph.program : undefined;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returning = params.get('return') === 'review';
  const committedNavigation = useRef(false);
  const pending = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [descriptionOpen, setDescriptionOpen] = useState(Boolean(program?.description));
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
      scheduleType: program?.scheduleType ?? 'weekly',
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
        scheduleType: values.scheduleType,
      };
      const saved = await programBuilder.saveBasics(input, program?.id);
      reset(values);
      committedNavigation.current = true;
      await navigate(
        returning
          ? reviewDestination(`/plan/${saved.id}`, params)
          : `/plan/${saved.id}/build/template`,
        { replace: true },
      );
    } catch (failure) {
      pending.current = false;
      committedNavigation.current = false;
      setSaveError(
        failure instanceof Error
          ? failure.message
          : 'The program could not be saved. Your existing data is unchanged.',
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
          <h2>Program details</h2>
          <p className="text-secondary">
            Give your program a name and choose your goals to get started.
          </p>
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
            {descriptionOpen ? (
              <Textarea
                aria-label="Description or notes"
                maxLength={2000}
                placeholder="Build strength, improve muscle mass, or get in better shape…"
                {...register('description')}
                rows={3}
              />
            ) : (
              <Button
                aria-label="Add description"
                className="description-toggle w-full justify-start"
                onClick={() => setDescriptionOpen(true)}
              >
                <Plus size={20} /> Add description
              </Button>
            )}
          </label>
          <div className="basics-options">
            <SegmentedSelector
              legend="Goal"
              options={['strength', 'hypertrophy', 'general']}
              value={watch('goal')}
              onChange={(value) => setValue('goal', value, { shouldDirty: true })}
            />
            <div className="basics-option-icons" aria-hidden="true">
              <Dumbbell />
              <ChartNoAxesColumnIncreasing />
              <Target />
            </div>
          </div>
          <div className="basics-options">
            <SegmentedSelector
              legend="Training experience"
              options={['beginner', 'intermediate', 'advanced']}
              value={watch('level')}
              onChange={(value) => setValue('level', value, { shouldDirty: true })}
            />
            <div className="basics-option-icons" aria-hidden="true">
              <UserRound />
              <ChartNoAxesColumnIncreasing />
              <Crown />
            </div>
          </div>
          <fieldset className="schedule-type-options">
            <legend>Schedule type</legend>
            <p>Choose how you want to structure your training.</p>
            {(['weekly', 'cycle'] as const).map((value) => (
              <label
                key={value}
                className={`schedule-choice ${watch('scheduleType') === value ? 'is-selected' : ''}`}
              >
                <input type="radio" value={value} {...register('scheduleType')} />
                <span className="schedule-choice-icon">
                  {value === 'weekly' ? <CalendarDays /> : <Repeat2 />}
                </span>
                <span>
                  <strong>{value === 'weekly' ? 'Weekly Schedule' : 'Flexible Cycle'}</strong>
                  <small>
                    {value === 'weekly'
                      ? 'Train on specific days of the week.'
                      : 'Follow workouts in sequence, independent of weekdays.'}
                  </small>
                </span>
                <Check className="choice-check" size={18} />
                <div className="schedule-example">
                  {(value === 'weekly'
                    ? ['Mon · Push', 'Wed · Pull', 'Fri · Legs']
                    : ['Day 1 · Push', 'Day 2 · Pull', 'Day 3 · Legs', 'Day 4 · Rest']
                  ).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <div className="schedule-best">
                  <span>Best for:</span>
                  <small>
                    ✓ {value === 'weekly' ? 'Fixed weekly routines' : 'Rotating routines'}
                  </small>
                  <small>
                    ✓ {value === 'weekly' ? 'Predictable gym days' : 'Flexible training weeks'}
                  </small>
                </div>
              </label>
            ))}
          </fieldset>
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
            <NextLabel>
              {isSubmitting
                ? 'Saving…'
                : returning
                  ? 'Save & return to Review'
                  : 'Continue to Template'}
            </NextLabel>
          </Button>
        </BuilderFooter>
      </form>
    </section>
  );
}
