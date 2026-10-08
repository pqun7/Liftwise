import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/FormControl';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router-dom';

import type { ProgramExercise } from '../../domain/entities';
import type { HydratedProgramDay } from './programService';
import { createPrescription, updatePrescription } from './programService';
import { BuilderHeader } from './BuilderChrome';
import { UnsavedChanges } from './UnsavedChanges';
import { reviewSuffix } from './reviewNavigation';

interface EditorData extends HydratedProgramDay {
  selected: HydratedProgramDay['exercises'][number]['exercise'];
  prescription: ProgramExercise | null;
}
interface Values {
  targetSets: string;
  minReps: string;
  maxReps: string;
  targetRirMin: string;
  targetRirMax: string;
  restSeconds: string;
  notes: string;
}
const optionalNumber = (value: string) => (value.trim() === '' ? null : Number(value));

export function PrescriptionFormPage() {
  const { data } = useLoaderData<{ data: EditorData }>();
  const { selected, prescription, day, program } = data;
  const navigate = useNavigate();
  const committedNavigation = useRef(false);
  const [params] = useSearchParams();
  const returnTo =
    params.get('return') === 'editor'
      ? `/plan/${program.id}?tab=edit#day-${day.id}`
      : `/plan/${program.id}/days/${day.id}${reviewSuffix(params)}`;
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    defaultValues: {
      targetSets: prescription?.targetSets?.toString() ?? '3',
      minReps: prescription?.minReps?.toString() ?? '6',
      maxReps: prescription?.maxReps?.toString() ?? '8',
      targetRirMin: prescription?.targetRirMin?.toString() ?? '1',
      targetRirMax: prescription?.targetRirMax?.toString() ?? '2',
      restSeconds: prescription
        ? (prescription.restSeconds?.toString() ?? '')
        : (day.defaultRestSeconds?.toString() ?? '180'),
      notes: prescription?.notes ?? '',
    },
  });
  const submit = handleSubmit(async (values) => {
    const input = {
      targetSets: optionalNumber(values.targetSets),
      minReps: optionalNumber(values.minReps),
      maxReps: optionalNumber(values.maxReps),
      targetRirMin: optionalNumber(values.targetRirMin),
      targetRirMax: optionalNumber(values.targetRirMax),
      restSeconds: optionalNumber(values.restSeconds),
      notes: values.notes.trim() || null,
    };
    if (input.minReps !== null && input.maxReps !== null && input.minReps > input.maxReps) {
      setError('maxReps', { message: 'Maximum reps must be at least minimum reps.' });
      return;
    }
    if (
      input.targetRirMin !== null &&
      input.targetRirMax !== null &&
      input.targetRirMin > input.targetRirMax
    ) {
      setError('targetRirMax', { message: 'Maximum RIR must be at least minimum RIR.' });
      return;
    }
    setSaveError(null);
    try {
      if (prescription) await updatePrescription(prescription.id, input);
      else await createPrescription(day.id, selected.id, input);
      reset(values);
      committedNavigation.current = true;
      await navigate(returnTo, { replace: true });
    } catch {
      committedNavigation.current = false;
      setSaveError('The prescription could not be saved. Check each value and try again.');
    }
  });
  const numberRules = {
    min: { value: 0, message: 'Use zero or a positive number.' },
    valueAsNumber: false,
  };
  return (
    <section className="builder-page" aria-labelledby="prescription-title">
      <BuilderHeader title="Exercise targets" back={returnTo} />
      <UnsavedChanges
        dirty={isDirty}
        saving={isSubmitting}
        committedNavigation={committedNavigation}
      />
      <p className="type-body-small text-secondary">{day.name}</p>
      <header className="program-header">
        <p className="section-kicker">Exercise targets</p>
        <h2 id="prescription-title" className="type-page-title">
          {selected.name}
        </h2>
        <p>Set your sets, reps, effort and rest for this exercise.</p>
      </header>
      <form
        className="builder-card ui-card exercise-form ui-card prescription-form"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <p className="text-secondary">
          RIR means reps in reserve: how many more reps you could perform at the end of a set.
        </p>
        <label>
          <span>Target sets</span>
          <Input
            type="number"
            inputMode="numeric"
            min="1"
            {...register('targetSets', {
              required: 'Enter target sets.',
              min: { value: 1, message: 'Use at least one set.' },
            })}
          />
          {errors.targetSets ? <small role="alert">{errors.targetSets.message}</small> : null}
        </label>
        <div className="field-pair">
          <label>
            <span>Minimum reps</span>
            <Input
              type="number"
              inputMode="numeric"
              aria-invalid={Boolean(errors.minReps)}
              aria-describedby={errors.minReps ? 'min-reps-error' : undefined}
              {...register('minReps', numberRules)}
            />
            {errors.minReps ? (
              <small id="min-reps-error" role="alert">
                {errors.minReps.message}
              </small>
            ) : null}
          </label>
          <label>
            <span>Maximum reps</span>
            <Input type="number" inputMode="numeric" {...register('maxReps', numberRules)} />
            {errors.maxReps ? <small role="alert">{errors.maxReps.message}</small> : null}
          </label>
        </div>
        <div className="field-pair">
          <label>
            <span>Minimum RIR</span>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              max="10"
              aria-invalid={Boolean(errors.targetRirMin)}
              aria-describedby={errors.targetRirMin ? 'min-rir-error' : undefined}
              {...register('targetRirMin', {
                min: { value: 0, message: 'RIR must be between 0 and 10.' },
                max: { value: 10, message: 'RIR must be between 0 and 10.' },
              })}
            />
            {errors.targetRirMin ? (
              <small id="min-rir-error" role="alert">
                {errors.targetRirMin.message}
              </small>
            ) : null}
          </label>
          <label>
            <span>Maximum RIR</span>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              max="10"
              aria-invalid={Boolean(errors.targetRirMax)}
              aria-describedby={errors.targetRirMax ? 'max-rir-error' : undefined}
              {...register('targetRirMax', {
                min: { value: 0, message: 'RIR must be between 0 and 10.' },
                max: { value: 10, message: 'RIR must be between 0 and 10.' },
              })}
            />
            {errors.targetRirMax ? (
              <small id="max-rir-error" role="alert">
                {errors.targetRirMax.message}
              </small>
            ) : null}
          </label>
        </div>
        <label>
          <span>Rest duration in seconds</span>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            max="3600"
            step="5"
            aria-invalid={Boolean(errors.restSeconds)}
            aria-describedby={errors.restSeconds ? 'rest-error' : undefined}
            {...register('restSeconds', {
              min: { value: 0, message: 'Rest must be between 0 and 3600 seconds.' },
              max: { value: 3600, message: 'Rest must be between 0 and 3600 seconds.' },
            })}
          />
          {errors.restSeconds ? (
            <small id="rest-error" role="alert">
              {errors.restSeconds.message}
            </small>
          ) : null}
        </label>
        <label>
          <span>Exercise notes</span>
          <Textarea rows={3} {...register('notes')} />
        </label>
        {saveError ? (
          <p className="form-error" role="alert">
            {saveError}
          </p>
        ) : null}
        <Button
          variant="primary"
          className="w-full min-h-[54px]"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving…' : prescription ? 'Save prescription' : 'Add to day'}
        </Button>
      </form>
    </section>
  );
}
